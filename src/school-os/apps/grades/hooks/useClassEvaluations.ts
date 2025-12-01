/**
 * Hook pour récupérer les évaluations d'une classe par matière
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClassEvaluation {
  id: string;
  name: string;
  evaluation_date: string | null;
  max_score: number;
  coefficient: number;
  include_in_average: boolean;
  description: string | null;
  class_subject_id: string;
  evaluation_type: {
    id: string;
    name: string;
  } | null;
  subject: {
    id: string;
    name: string;
  };
  grades_count: number;
}

export const useClassEvaluations = (classId?: string, subjectId?: string) => {
  return useQuery({
    queryKey: ['class-evaluations', classId, subjectId],
    queryFn: async (): Promise<ClassEvaluation[]> => {
      if (!classId) return [];

      // Récupérer les class_subjects pour cette classe
      let classSubjectsQuery = supabase
        .from('class_subjects')
        .select('id, subject_id, subjects(id, name)')
        .eq('class_id', classId);

      if (subjectId) {
        classSubjectsQuery = classSubjectsQuery.eq('subject_id', subjectId);
      }

      const { data: classSubjects, error: csError } = await classSubjectsQuery;

      if (csError) {
        console.error('Error fetching class subjects:', csError);
        throw csError;
      }

      if (!classSubjects || classSubjects.length === 0) return [];

      const classSubjectIds = classSubjects.map(cs => cs.id);

      // Récupérer les évaluations
      const { data: evaluations, error } = await supabase
        .from('evaluations')
        .select(`
          id,
          name,
          evaluation_date,
          max_score,
          coefficient,
          include_in_average,
          description,
          class_subject_id,
          school_evaluation_types(id, name)
        `)
        .in('class_subject_id', classSubjectIds)
        .order('evaluation_date', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching evaluations:', error);
        throw error;
      }

      // Compter les notes pour chaque évaluation
      const evaluationIds = evaluations?.map(e => e.id) || [];
      const { data: gradesCount } = await supabase
        .from('grades')
        .select('evaluation_id')
        .in('evaluation_id', evaluationIds);

      const gradesCountMap = new Map<string, number>();
      gradesCount?.forEach((g: any) => {
        gradesCountMap.set(g.evaluation_id, (gradesCountMap.get(g.evaluation_id) || 0) + 1);
      });

      // Mapper les évaluations avec leurs matières
      return (evaluations || []).map((evaluation: any) => {
        const classSubject = classSubjects.find(cs => cs.id === evaluation.class_subject_id);
        return {
          id: evaluation.id,
          name: evaluation.name,
          evaluation_date: evaluation.evaluation_date,
          max_score: evaluation.max_score,
          coefficient: evaluation.coefficient,
          include_in_average: evaluation.include_in_average,
          description: evaluation.description,
          class_subject_id: evaluation.class_subject_id,
          evaluation_type: evaluation.school_evaluation_types,
          subject: classSubject?.subjects || { id: '', name: 'Inconnue' },
          grades_count: gradesCountMap.get(evaluation.id) || 0,
        };
      });
    },
    enabled: !!classId,
  });
};
