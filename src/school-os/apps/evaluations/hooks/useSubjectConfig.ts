/**
 * Hook pour gérer la configuration d'une matière dans une évaluation
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpdateSubjectConfigParams {
  evaluationId: string;
  classId: string;
  subjectId: string;
  config: {
    evaluation_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
  };
}

export const useUpdateSubjectConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ evaluationId, classId, subjectId, config }: UpdateSubjectConfigParams) => {
      console.log('📝 Updating subject config:', { evaluationId, classId, subjectId, config });

      // 1. Trouver le class_config_id
      const { data: classConfig, error: configError } = await supabase
        .from('school_evaluation_class_configs')
        .select('id')
        .eq('evaluation_id', evaluationId)
        .eq('class_id', classId)
        .single();

      if (configError || !classConfig) {
        throw new Error('Configuration de classe non trouvée');
      }

      // 2. Mettre à jour la matière
      const { error: updateError } = await supabase
        .from('school_evaluation_class_subjects')
        .update({
          evaluation_date: config.evaluation_date,
          start_time: config.start_time,
          end_time: config.end_time,
        })
        .eq('class_config_id', classConfig.id)
        .eq('subject_id', subjectId);

      if (updateError) {
        console.error('❌ Error updating subject config:', updateError);
        throw updateError;
      }

      console.log('✅ Subject config updated');
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-evaluations'] });
    },
    onError: (error: any) => {
      console.error('Error updating subject config:', error);
      toast.error(`Erreur: ${error.message || 'Erreur inconnue'}`);
    },
  });
};
