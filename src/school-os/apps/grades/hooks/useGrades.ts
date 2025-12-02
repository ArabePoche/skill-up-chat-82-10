/**
 * Hook pour gérer les notes des élèves
 * Supporte la notation par matière (une note par matière par élève par évaluation)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface SubjectInfo {
  id: string;
  name: string;
}

export interface StudentGrade {
  id: string;
  student_id: string;
  evaluation_id: string;
  subject_id: string | null;
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
  subject_id: string | null;
  score: number | null;
  is_absent?: boolean;
  is_excused?: boolean;
  comment?: string;
}

export interface EvaluationGradesData {
  students: StudentGrade[];
  subjects: SubjectInfo[];
  gradesMap: Map<string, Map<string, StudentGrade>>; // student_id -> subject_id -> grade
}

export const useEvaluationGrades = (evaluationId?: string) => {
  return useQuery({
    queryKey: ['evaluation-grades', evaluationId],
    queryFn: async (): Promise<EvaluationGradesData> => {
      if (!evaluationId) return { students: [], subjects: [], gradesMap: new Map() };

      // Récupérer les configurations de classe pour cette évaluation
      const { data: configs, error: configError } = await supabase
        .from('school_evaluation_class_configs')
        .select(`
          id,
          class_id,
          school_evaluation_class_subjects(
            subject_id,
            subjects(id, name)
          )
        `)
        .eq('evaluation_id', evaluationId);

      if (configError) {
        console.error('Error fetching evaluation configs:', configError);
        throw configError;
      }

      if (!configs || configs.length === 0) {
        return await fetchGradesFromOldTable(evaluationId);
      }

      // Extraire les matières de l'évaluation
      const subjectsMap = new Map<string, SubjectInfo>();
      configs.forEach((config: any) => {
        const classSubjects = config.school_evaluation_class_subjects || [];
        classSubjects.forEach((cs: any) => {
          if (cs.subjects) {
            subjectsMap.set(cs.subjects.id, {
              id: cs.subjects.id,
              name: cs.subjects.name,
            });
          }
        });
      });
      const subjects = Array.from(subjectsMap.values());

      // Récupérer les IDs des configs et classes
      const configIds = configs.map((c: any) => c.id);
      const classIds = configs.map((c: any) => c.class_id);

      // Récupérer les élèves exclus
      const { data: excludedData } = await supabase
        .from('school_evaluation_excluded_students')
        .select('student_id')
        .in('class_config_id', configIds);

      const excludedStudentIds = new Set<string>(
        (excludedData || []).map((e: any) => e.student_id)
      );

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

      // Récupérer les notes existantes (incluant subject_id)
      const { data: grades, error: gradesError } = await supabase
        .from('grades')
        .select('*')
        .eq('evaluation_id', evaluationId);

      if (gradesError) {
        console.error('Error fetching grades:', gradesError);
        throw gradesError;
      }

      // Construire la map des notes: student_id -> subject_id -> grade
      const gradesMap = new Map<string, Map<string, StudentGrade>>();
      
      (grades || []).forEach((grade: any) => {
        const studentId = grade.student_id;
        const subjectId = grade.subject_id || 'default';
        
        if (!gradesMap.has(studentId)) {
          gradesMap.set(studentId, new Map());
        }
        
        const studentGradesMap = gradesMap.get(studentId)!;
        const student = filteredStudents.find((s: any) => s.id === studentId);
        
        if (student) {
          studentGradesMap.set(subjectId, {
            id: grade.id,
            student_id: studentId,
            evaluation_id: evaluationId,
            subject_id: grade.subject_id,
            score: grade.score,
            is_absent: grade.is_absent ?? false,
            is_excused: grade.is_excused ?? false,
            comment: grade.comment,
            entered_at: grade.entered_at,
            entered_by: grade.entered_by,
            student: {
              id: student.id,
              first_name: student.first_name,
              last_name: student.last_name,
              student_code: student.student_code,
              photo_url: student.photo_url,
            },
          });
        }
      });

      // Créer la liste des élèves avec leurs infos
      const studentGrades: StudentGrade[] = filteredStudents.map((student: any) => ({
        id: '',
        student_id: student.id,
        evaluation_id: evaluationId,
        subject_id: null,
        score: null,
        is_absent: false,
        is_excused: false,
        comment: null,
        entered_at: null,
        entered_by: null,
        student: {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          student_code: student.student_code,
          photo_url: student.photo_url,
        },
      }));

      return {
        students: studentGrades,
        subjects,
        gradesMap,
      };
    },
    enabled: !!evaluationId,
  });
};

// Fallback pour l'ancienne table evaluations (compatibilité)
async function fetchGradesFromOldTable(evaluationId: string): Promise<EvaluationGradesData> {
  const { data: evaluation, error: evalError } = await (supabase as any)
    .from('evaluations')
    .select('class_subject_id, class_subjects(class_id, subject_id, subjects(id, name))')
    .eq('id', evaluationId)
    .single();

  if (evalError || !evaluation) {
    console.error('Error fetching evaluation:', evalError);
    return { students: [], subjects: [], gradesMap: new Map() };
  }

  const classSubject = evaluation.class_subjects as any;
  const classId = classSubject?.class_id;
  if (!classId) return { students: [], subjects: [], gradesMap: new Map() };

  // Matière de l'évaluation
  const subjects: SubjectInfo[] = classSubject?.subjects 
    ? [{ id: classSubject.subjects.id, name: classSubject.subjects.name }]
    : [];

  // Récupérer les élèves de la classe
  const { data: students, error: studentsError } = await supabase
    .from('students_school')
    .select('id, first_name, last_name, student_code, photo_url')
    .eq('class_id', classId)
    .eq('status', 'active')
    .order('last_name');

  if (studentsError) {
    console.error('Error fetching students:', studentsError);
    return { students: [], subjects: [], gradesMap: new Map() };
  }

  // Récupérer les notes existantes
  const { data: grades, error: gradesError } = await supabase
    .from('grades')
    .select('*')
    .eq('evaluation_id', evaluationId);

  if (gradesError) {
    console.error('Error fetching grades:', gradesError);
    return { students: [], subjects: [], gradesMap: new Map() };
  }

  const gradesMap = new Map<string, Map<string, StudentGrade>>();
  
  (grades || []).forEach((grade: any) => {
    const studentId = grade.student_id;
    const subjectId = grade.subject_id || 'default';
    
    if (!gradesMap.has(studentId)) {
      gradesMap.set(studentId, new Map());
    }
    
    const student = (students || []).find((s: any) => s.id === studentId);
    if (student) {
      gradesMap.get(studentId)!.set(subjectId, {
        id: grade.id,
        student_id: studentId,
        evaluation_id: evaluationId,
        subject_id: grade.subject_id,
        score: grade.score,
        is_absent: grade.is_absent ?? false,
        is_excused: grade.is_excused ?? false,
        comment: grade.comment,
        entered_at: grade.entered_at,
        entered_by: grade.entered_by,
        student: {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          student_code: student.student_code,
          photo_url: student.photo_url,
        },
      });
    }
  });

  const studentGrades: StudentGrade[] = (students || []).map((student: any) => ({
    id: '',
    student_id: student.id,
    evaluation_id: evaluationId,
    subject_id: null,
    score: null,
    is_absent: false,
    is_excused: false,
    comment: null,
    entered_at: null,
    entered_by: null,
    student: {
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      student_code: student.student_code,
      photo_url: student.photo_url,
    },
  }));

  return { students: studentGrades, subjects, gradesMap };
}

export const useSaveGrades = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (grades: GradeInput[]) => {
      if (!user?.id) throw new Error('Non authentifié');

      const results = [];

      for (const grade of grades) {
        // Vérifier si une note existe déjà pour cette combinaison
        let query = supabase
          .from('grades')
          .select('id')
          .eq('student_id', grade.student_id)
          .eq('evaluation_id', grade.evaluation_id);
        
        // Gérer le cas où subject_id peut être null
        if (grade.subject_id) {
          query = query.eq('subject_id', grade.subject_id);
        } else {
          query = query.is('subject_id', null);
        }

        const { data: existing } = await query.single();

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
              subject_id: grade.subject_id,
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
