/**
 * Hook pour gérer les évaluations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EvaluationData {
  id?: string;
  title: string;
  evaluation_type_id: string;
  school_id: string;
  school_year_id: string;
  classes_config: ClassConfig[];
}

export interface ClassConfig {
  class_id: string;
  subjects: string[];
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

      let query = supabase
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
          created_at,
          school_evaluation_types(name),
          class_subjects(
            id,
            classes(name),
            subjects(name)
          )
        `)
        .order('evaluation_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });
};

export const useCreateEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EvaluationData) => {
      // Cette mutation sera implémentée avec une edge function
      // pour gérer la logique complexe de création multi-classes
      const { data: result, error } = await supabase.functions.invoke('create-evaluation', {
        body: data,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      toast.success('Évaluation créée avec succès');
    },
    onError: (error) => {
      console.error('Error creating evaluation:', error);
      toast.error('Erreur lors de la création de l\'évaluation');
    },
  });
};

export const useUpdateEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EvaluationData> }) => {
      const { data: result, error } = await supabase.functions.invoke('update-evaluation', {
        body: { id, ...data },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      toast.success('Évaluation mise à jour');
    },
    onError: (error) => {
      console.error('Error updating evaluation:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });
};

export const useDeleteEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('evaluations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      toast.success('Évaluation supprimée');
    },
    onError: (error) => {
      console.error('Error deleting evaluation:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
};
