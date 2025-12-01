/**
 * Hook pour gérer les évaluations
 * Gère la création, modification et suppression des évaluations scolaires
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EvaluationData {
  id?: string;
  title: string;
  description?: string;
  evaluation_type_id: string;
  school_id: string;
  school_year_id: string;
  max_score?: number;
  coefficient?: number;
  include_in_average?: boolean;
  classes_config: ClassConfig[];
}

export interface ClassConfig {
  class_id: string;
  subjects: string[]; // class_subject_ids
  excluded_students: string[];
  supervisors: string[];
  room: string;
  location_type: 'room' | 'external';
  external_location?: string;
  date: string;
  start_time: string;
  end_time: string;
  questionnaires: QuestionnaireData[];
}

export interface QuestionnaireData {
  subject_id: string;
  title?: string;
  instructions?: string;
  file_url?: string;
  total_points: number;
}

export const useEvaluations = (schoolId?: string, schoolYearId?: string) => {
  return useQuery({
    queryKey: ['evaluations', schoolId, schoolYearId],
    queryFn: async () => {
      if (!schoolId) return [];

      // Récupérer les évaluations avec les relations
      const { data, error } = await supabase
        .from('evaluations')
        .select(`
          id,
          name,
          evaluation_type_id,
          evaluation_date,
          max_score,
          coefficient,
          class_subject_id,
          grading_period_id,
          description,
          include_in_average,
          created_at,
          school_evaluation_types(id, name),
          class_subjects(
            id,
            classes(id, name, school_id),
            subjects(id, name)
          )
        `)
        .order('evaluation_date', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching evaluations:', error);
        throw error;
      }

      // Filtrer par school_id via la relation class_subjects -> classes
      const filteredData = (data || []).filter(
        (evaluation: any) => evaluation.class_subjects?.classes?.school_id === schoolId
      );

      return filteredData;
    },
    enabled: !!schoolId,
  });
};

export const useCreateEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EvaluationData) => {
      console.log('📝 Creating evaluation with data:', data);

      const createdEvaluations: any[] = [];

      // Pour chaque classe configurée
      for (const classConfig of data.classes_config) {
        // Pour chaque matière sélectionnée dans cette classe
        for (const classSubjectId of classConfig.subjects) {
          const evaluationData = {
            name: data.title,
            description: data.description || null,
            evaluation_type_id: data.evaluation_type_id,
            class_subject_id: classSubjectId,
            evaluation_date: classConfig.date || null,
            max_score: data.max_score || 20,
            coefficient: data.coefficient || 1,
            include_in_average: data.include_in_average ?? true,
          };

          console.log('📝 Inserting evaluation:', evaluationData);

          const { data: result, error } = await supabase
            .from('evaluations')
            .insert(evaluationData)
            .select()
            .single();

          if (error) {
            console.error('❌ Error creating evaluation:', error);
            throw error;
          }

          createdEvaluations.push(result);
          console.log('✅ Evaluation created:', result);
        }
      }

      return createdEvaluations;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      const count = data.length;
      toast.success(`${count} évaluation${count > 1 ? 's' : ''} créée${count > 1 ? 's' : ''} avec succès`);
    },
    onError: (error: any) => {
      console.error('Error creating evaluation:', error);
      toast.error(`Erreur lors de la création: ${error.message || 'Erreur inconnue'}`);
    },
  });
};

export const useUpdateEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EvaluationData> }) => {
      console.log('📝 Updating evaluation:', id, data);

      const updateData: any = {};
      
      if (data.title) updateData.name = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.evaluation_type_id) updateData.evaluation_type_id = data.evaluation_type_id;
      if (data.max_score !== undefined) updateData.max_score = data.max_score;
      if (data.coefficient !== undefined) updateData.coefficient = data.coefficient;
      if (data.include_in_average !== undefined) updateData.include_in_average = data.include_in_average;

      // Si on a une config de classe, mettre à jour la date
      if (data.classes_config && data.classes_config.length > 0) {
        const firstConfig = data.classes_config[0];
        if (firstConfig.date) updateData.evaluation_date = firstConfig.date;
        if (firstConfig.subjects && firstConfig.subjects.length > 0) {
          updateData.class_subject_id = firstConfig.subjects[0];
        }
      }

      const { data: result, error } = await supabase
        .from('evaluations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating evaluation:', error);
        throw error;
      }

      console.log('✅ Evaluation updated:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      toast.success('Évaluation mise à jour');
    },
    onError: (error: any) => {
      console.error('Error updating evaluation:', error);
      toast.error(`Erreur lors de la mise à jour: ${error.message || 'Erreur inconnue'}`);
    },
  });
};

export const useDeleteEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('🗑️ Deleting evaluation:', id);

      const { error } = await supabase
        .from('evaluations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting evaluation:', error);
        throw error;
      }

      console.log('✅ Evaluation deleted');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      toast.success('Évaluation supprimée');
    },
    onError: (error: any) => {
      console.error('Error deleting evaluation:', error);
      toast.error(`Erreur lors de la suppression: ${error.message || 'Erreur inconnue'}`);
    },
  });
};
