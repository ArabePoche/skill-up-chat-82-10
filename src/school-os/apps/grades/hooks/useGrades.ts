/**
 * Hook pour gérer les notes des élèves
 * Compatible avec school_evaluations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface StudentGrade {
  id: string;
  student_id: string;
  evaluation_id: string;
  score: number | null;
  is_absent: boolean;
  is_excused: boolean;
  comment: string | null;
  entered_at: string | null;
  entered_by: string | null;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    student_code: string;
    photo_url: string | null;
  };
}

export interface GradeInput {
  student_id: string;
  evaluation_id: string;
  score: number | null;
  is_absent?: boolean;
  is_excused?: boolean;
  comment?: string;
}

export const useEvaluationGrades = (evaluationId?: string) => {
  return useQuery({
    queryKey: ['evaluation-grades', evaluationId],
    queryFn: async (): Promise<StudentGrade[]> => {
      if (!evaluationId) return [];

      // Récupérer les configurations de classe pour cette évaluation
      const { data: configs, error: configError } = await supabase
        .from('school_evaluation_class_configs')
        .select(`
          id,
          class_id,
          school_evaluation_excluded_students(student_id)
        `)
        .eq('evaluation_id', evaluationId);

      if (configError) {
        console.error('Error fetching evaluation configs:', configError);
        throw configError;
      }

      if (!configs || configs.length === 0) {
        // Fallback: essayer avec l'ancienne table evaluations
        return await fetchGradesFromOldTable(evaluationId);
      }

      // Récupérer les élèves exclus
      const excludedStudentIds = new Set<string>();
      configs.forEach((config: any) => {
        config.school_evaluation_excluded_students?.forEach((excluded: any) => {
          if (excluded.student_id) {
            excludedStudentIds.add(excluded.student_id);
          }
        });
      });

      // Récupérer les IDs des classes
      const classIds = configs.map((c: any) => c.class_id);

      // Récupérer les élèves des classes
      const { data: students, error: studentsError } = await supabase
        .from('students_school')
        .select('id, first_name, last_name, student_code, photo_url')
        .in('class_id', classIds)
        .eq('status', 'active')
        .order('last_name');

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        throw studentsError;
      }

      // Filtrer les élèves exclus
      const filteredStudents = (students || []).filter(
        (student: any) => !excludedStudentIds.has(student.id)
      );

      // Récupérer les notes existantes
      const { data: grades, error: gradesError } = await supabase
        .from('grades')
        .select('*')
        .eq('evaluation_id', evaluationId);

      if (gradesError) {
        console.error('Error fetching grades:', gradesError);
        throw gradesError;
      }

      // Mapper les notes aux élèves
      const gradesMap = new Map(grades?.map((g: any) => [g.student_id, g]) || []);

      return filteredStudents.map((student: any) => {
        const grade = gradesMap.get(student.id);
        return {
          id: grade?.id || '',
          student_id: student.id,
          evaluation_id: evaluationId,
          score: grade?.score ?? null,
          is_absent: grade?.is_absent ?? false,
          is_excused: grade?.is_excused ?? false,
          comment: grade?.comment ?? null,
          entered_at: grade?.entered_at ?? null,
          entered_by: grade?.entered_by ?? null,
          student: {
            id: student.id,
            first_name: student.first_name,
            last_name: student.last_name,
            student_code: student.student_code,
            photo_url: student.photo_url,
          },
        };
      });
    },
    enabled: !!evaluationId,
  });
};

// Fallback pour l'ancienne table evaluations (compatibilité)
async function fetchGradesFromOldTable(evaluationId: string): Promise<StudentGrade[]> {
  const { data: evaluation, error: evalError } = await supabase
    .from('evaluations')
    .select('class_subject_id, class_subjects(class_id)')
    .eq('id', evaluationId)
    .single();

  if (evalError || !evaluation) {
    console.error('Error fetching evaluation:', evalError);
    return [];
  }

  const classId = (evaluation.class_subjects as any)?.class_id;
  if (!classId) return [];

  // Récupérer les élèves de la classe
  const { data: students, error: studentsError } = await supabase
    .from('students_school')
    .select('id, first_name, last_name, student_code, photo_url')
    .eq('class_id', classId)
    .eq('status', 'active')
    .order('last_name');

  if (studentsError) {
    console.error('Error fetching students:', studentsError);
    return [];
  }

  // Récupérer les notes existantes
  const { data: grades, error: gradesError } = await supabase
    .from('grades')
    .select('*')
    .eq('evaluation_id', evaluationId);

  if (gradesError) {
    console.error('Error fetching grades:', gradesError);
    return [];
  }

  const gradesMap = new Map(grades?.map((g: any) => [g.student_id, g]) || []);

  return (students || []).map((student: any) => {
    const grade = gradesMap.get(student.id);
    return {
      id: grade?.id || '',
      student_id: student.id,
      evaluation_id: evaluationId,
      score: grade?.score ?? null,
      is_absent: grade?.is_absent ?? false,
      is_excused: grade?.is_excused ?? false,
      comment: grade?.comment ?? null,
      entered_at: grade?.entered_at ?? null,
      entered_by: grade?.entered_by ?? null,
      student: {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        student_code: student.student_code,
        photo_url: student.photo_url,
      },
    };
  });
}

export const useSaveGrades = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (grades: GradeInput[]) => {
      if (!user?.id) throw new Error('Non authentifié');

      const results = [];

      for (const grade of grades) {
        // Vérifier si une note existe déjà
        const { data: existing } = await supabase
          .from('grades')
          .select('id')
          .eq('student_id', grade.student_id)
          .eq('evaluation_id', grade.evaluation_id)
          .single();

        if (existing?.id) {
          // Mise à jour
          const { data, error } = await supabase
            .from('grades')
            .update({
              score: grade.score,
              is_absent: grade.is_absent || false,
              is_excused: grade.is_excused || false,
              comment: grade.comment || null,
              entered_by: user.id,
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;
          results.push(data);
        } else {
          // Création
          const { data, error } = await supabase
            .from('grades')
            .insert({
              student_id: grade.student_id,
              evaluation_id: grade.evaluation_id,
              score: grade.score,
              is_absent: grade.is_absent || false,
              is_excused: grade.is_excused || false,
              comment: grade.comment || null,
              entered_by: user.id,
            })
            .select()
            .single();

          if (error) throw error;
          results.push(data);
        }
      }

      return results;
    },
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({ 
          queryKey: ['evaluation-grades', variables[0].evaluation_id] 
        });
        queryClient.invalidateQueries({ queryKey: ['class-evaluations'] });
      }
      toast.success('Notes enregistrées avec succès');
    },
    onError: (error: any) => {
      console.error('Error saving grades:', error);
      toast.error('Erreur lors de l\'enregistrement des notes');
    },
  });
};

export const useDeleteGrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gradeId, evaluationId }: { gradeId: string; evaluationId: string }) => {
      const { error } = await supabase
        .from('grades')
        .delete()
        .eq('id', gradeId);

      if (error) throw error;
      return { gradeId, evaluationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-grades', data.evaluationId] });
      queryClient.invalidateQueries({ queryKey: ['class-evaluations'] });
      toast.success('Note supprimée');
    },
    onError: (error: any) => {
      console.error('Error deleting grade:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
};
