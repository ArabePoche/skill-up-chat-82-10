/**
 * Hook pour récupérer les évaluations d'une classe par matière
 * Utilise la table school_evaluations
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
  class_id: string;
  evaluation_type: {
    id: string;
    name: string;
  } | null;
  subject: {
    id: string;
    name: string;
  };
  subjects: {
    id: string;
    name: string;
  }[];
  grades_count: number;
}

export const useClassEvaluations = (classId?: string, subjectId?: string) => {
  return useQuery({
    queryKey: ['class-evaluations', classId, subjectId],
    queryFn: async (): Promise<ClassEvaluation[]> => {
      if (!classId) return [];

      // Récupérer les configurations de classe pour cette classe
      let configQuery = supabase
        .from('school_evaluation_class_configs')
        .select(`
          id,
          class_id,
          evaluation_date,
          school_evaluations(
            id,
            title,
            description,
            max_score,
            coefficient,
            include_in_average,
            evaluation_date,
            school_evaluation_types(id, name)
          ),
          school_evaluation_class_subjects(
            subject_id,
            subjects(id, name)
          )
        `)
        .eq('class_id', classId);

      const { data: configs, error: configError } = await configQuery;

      if (configError) {
        console.error('Error fetching class configs:', configError);
        throw configError;
      }

      if (!configs || configs.length === 0) return [];

      // Filtrer par matière si spécifié
      let filteredConfigs = configs;
      if (subjectId) {
        filteredConfigs = configs.filter((config: any) => 
          config.school_evaluation_class_subjects?.some(
            (cs: any) => cs.subject_id === subjectId
          )
        );
      }

      // Récupérer le nombre de notes pour chaque évaluation
      const evaluationIds = filteredConfigs
        .map((c: any) => c.school_evaluations?.id)
        .filter(Boolean);

      const { data: gradesCount } = await supabase
        .from('grades')
        .select('evaluation_id')
        .in('evaluation_id', evaluationIds);

      const gradesCountMap = new Map<string, number>();
      gradesCount?.forEach((g: any) => {
        gradesCountMap.set(g.evaluation_id, (gradesCountMap.get(g.evaluation_id) || 0) + 1);
      });

      // Mapper les évaluations
      return filteredConfigs.map((config: any) => {
        const evaluation = config.school_evaluations;
        const subjects = config.school_evaluation_class_subjects?.map(
          (cs: any) => cs.subjects
        ).filter(Boolean) || [];

        // Prendre la première matière comme matière principale (compatibilité)
        const primarySubject = subjects[0] || { id: '', name: 'Inconnue' };

        return {
          id: evaluation?.id || config.id,
          name: evaluation?.title || 'Sans titre',
          evaluation_date: config.evaluation_date || evaluation?.evaluation_date,
          max_score: evaluation?.max_score || 20,
          coefficient: evaluation?.coefficient || 1,
          include_in_average: evaluation?.include_in_average ?? true,
          description: evaluation?.description,
          class_id: config.class_id,
          evaluation_type: evaluation?.school_evaluation_types || null,
          subject: primarySubject,
          subjects,
          grades_count: gradesCountMap.get(evaluation?.id) || 0,
        };
      });
    },
    enabled: !!classId,
  });
};
