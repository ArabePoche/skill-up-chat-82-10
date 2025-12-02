/**
 * Hook pour récupérer les évaluations par matière
 * Permet la saisie directe par matière (méthode 2)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubjectEvaluation {
  id: string;
  name: string;
  evaluation_date: string | null;
  max_score: number;
  coefficient: number;
  class_config_id: string;
  class_id: string;
  class_name: string;
  students_count: number;
  grades_entered: number;
}

export interface SubjectWithEvaluations {
  subject: {
    id: string;
    name: string;
  };
  evaluations: SubjectEvaluation[];
}

/**
 * Récupère toutes les évaluations d'une matière pour une classe
 */
export const useSubjectEvaluations = (classId?: string, subjectId?: string) => {
  return useQuery({
    queryKey: ['subject-evaluations', classId, subjectId],
    queryFn: async (): Promise<SubjectEvaluation[]> => {
      if (!classId || !subjectId) return [];

      // Récupérer les configurations de classe qui incluent cette matière
      const { data: configs, error: configError } = await supabase
        .from('school_evaluation_class_configs')
        .select(`
          id,
          class_id,
          evaluation_date,
          classes(id, name),
          school_evaluations(
            id,
            title,
            max_score,
            coefficient,
            evaluation_date
          ),
          school_evaluation_class_subjects!inner(
            subject_id,
            subjects(id, name)
          )
        `)
        .eq('class_id', classId)
        .eq('school_evaluation_class_subjects.subject_id', subjectId);

      if (configError) {
        console.error('Error fetching subject evaluations:', configError);
        throw configError;
      }

      if (!configs || configs.length === 0) return [];

      // Récupérer le nombre de notes par évaluation et matière
      const evaluationIds = configs
        .map((c: any) => c.school_evaluations?.id)
        .filter(Boolean);

      const { data: gradesData } = await supabase
        .from('grades')
        .select('evaluation_id, subject_id')
        .in('evaluation_id', evaluationIds)
        .eq('subject_id', subjectId);

      const gradesCountMap = new Map<string, number>();
      gradesData?.forEach((g: any) => {
        gradesCountMap.set(g.evaluation_id, (gradesCountMap.get(g.evaluation_id) || 0) + 1);
      });

      // Récupérer le nombre d'élèves de la classe
      const { count: studentsCount } = await supabase
        .from('students_school')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('status', 'active');

      return configs.map((config: any) => {
        const evaluation = config.school_evaluations;
        const cls = config.classes as any;

        return {
          id: evaluation?.id || config.id,
          name: evaluation?.title || 'Sans titre',
          evaluation_date: config.evaluation_date || evaluation?.evaluation_date,
          max_score: evaluation?.max_score || 20,
          coefficient: evaluation?.coefficient || 1,
          class_config_id: config.id,
          class_id: config.class_id,
          class_name: cls?.name || '',
          students_count: studentsCount || 0,
          grades_entered: gradesCountMap.get(evaluation?.id) || 0,
        };
      });
    },
    enabled: !!classId && !!subjectId,
  });
};

/**
 * Récupère les élèves et leurs notes pour une évaluation et une matière spécifique
 */
export const useSubjectGrades = (evaluationId?: string, subjectId?: string) => {
  return useQuery({
    queryKey: ['subject-grades', evaluationId, subjectId],
    queryFn: async () => {
      if (!evaluationId || !subjectId) return { students: [], gradesMap: new Map() };

      // Récupérer la config de classe pour cette évaluation
      const { data: config, error: configError } = await supabase
        .from('school_evaluation_class_configs')
        .select('id, class_id')
        .eq('evaluation_id', evaluationId)
        .single();

      if (configError || !config) {
        console.error('Error fetching config:', configError);
        return { students: [], gradesMap: new Map() };
      }

      // Récupérer les élèves exclus
      const { data: excludedData } = await supabase
        .from('school_evaluation_excluded_students')
        .select('student_id')
        .eq('class_config_id', config.id);

      const excludedIds = new Set((excludedData || []).map((e: any) => e.student_id));

      // Récupérer les élèves de la classe
      const { data: students, error: studentsError } = await supabase
        .from('students_school')
        .select('id, first_name, last_name, student_code, photo_url')
        .eq('class_id', config.class_id)
        .eq('status', 'active')
        .order('last_name');

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        return { students: [], gradesMap: new Map() };
      }

      // Filtrer les exclus
      const filteredStudents = (students || []).filter(
        (s: any) => !excludedIds.has(s.id)
      );

      // Récupérer les notes existantes pour cette évaluation et matière
      const { data: grades, error: gradesError } = await supabase
        .from('grades')
        .select('*')
        .eq('evaluation_id', evaluationId)
        .eq('subject_id', subjectId);

      if (gradesError) {
        console.error('Error fetching grades:', gradesError);
        return { students: filteredStudents, gradesMap: new Map() };
      }

      // Map des notes par student_id
      const gradesMap = new Map();
      (grades || []).forEach((g: any) => {
        gradesMap.set(g.student_id, {
          id: g.id,
          score: g.score,
          is_absent: g.is_absent ?? false,
          is_excused: g.is_excused ?? false,
          comment: g.comment,
        });
      });

      return {
        students: filteredStudents.map((s: any) => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          student_code: s.student_code,
          photo_url: s.photo_url,
        })),
        gradesMap,
      };
    },
    enabled: !!evaluationId && !!subjectId,
  });
};
