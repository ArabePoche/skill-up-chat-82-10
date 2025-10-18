
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useValidateExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      messageId, 
      userId, 
      lessonId, 
      formationId,
      isValid,
      exerciseId,
      rejectReason
    }: {
      messageId: string;
      userId: string;
      lessonId: string;
      formationId: string;
      isValid: boolean;
      exerciseId?: string;
      rejectReason?: string;
    }) => {
      

      try {
        // Appeler la nouvelle fonction globale validate_exercise_submission_global
        const { data, error } = await supabase.rpc('validate_exercise_submission_global', {
          p_message_id: messageId,
          p_user_id: userId,
          p_is_approved: isValid,
          p_reject_reason: rejectReason || null
        });

        if (error) {
          console.error('Supabase RPC error:', error);
          throw new Error(`Erreur de validation: ${error.message}`);
        }

        console.log('✅ Global exercise validation:', data);
        return data;
      } catch (error) {
        console.error('Error in validation mutation:', error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Invalider toutes les queries pertinentes pour mise à jour temps réel
      const queriesToInvalidate = [
        ['student-messages', variables.lessonId, variables.formationId],
        ['teacher-messages', variables.lessonId, variables.formationId], 
        ['teacher-student-messages', variables.formationId, variables.userId, variables.lessonId],
        ['teacher-discussions-with-unread', variables.formationId],
        ['lesson-unlocking'],
        ['unread-messages-by-level', variables.formationId]
      ];

      // Forcer le refresh des queries pour que les nouveaux messages système apparaissent
      queriesToInvalidate.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
        queryClient.refetchQueries({ queryKey });
      });
      
      
      toast.success(variables.isValid ? 'Exercice validé avec succès !' : 'Exercice rejeté');
    },
    onError: (error: any) => {
      console.error('Erreur lors de la validation:', error);
      const errorMessage = error?.message || 'Erreur inconnue lors de la validation';
      toast.error(`Erreur: ${errorMessage}`);
    },
  });
};
