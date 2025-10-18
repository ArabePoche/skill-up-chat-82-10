
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export const useValidateExerciseWithPromotion = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      messageId, 
      userId, 
      lessonId, 
      formationId,
      isValid,
      rejectReason
    }: {
      messageId: string;
      userId: string;
      lessonId: string;
      formationId: string;
      isValid: boolean;
      rejectReason?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      console.log('Validating exercise with promotion:', { messageId, isValid, rejectReason, teacherId: user.id });

      try {
        // Appeler la nouvelle fonction avec support des promotions et l'ID du professeur
        const { data, error } = await supabase.rpc('validate_exercise_submission_with_promotion', {
          p_message_id: messageId,
          p_user_id: userId,
          p_is_approved: isValid,
          p_reject_reason: rejectReason || null,
          p_teacher_id: user.id
        });

        if (error) {
          console.error('Supabase RPC error:', error);
          throw new Error(`Erreur de validation: ${error.message}`);
        }

        console.log('Exercise validation with promotion completed successfully by teacher:', user.id);
        return data;
      } catch (error) {
        console.error('Error in validation mutation:', error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Invalider toutes les queries pertinentes pour mise à jour temps réel
      const queriesToInvalidate = [
        ['promotion-messages', variables.lessonId, variables.formationId],
        ['student-progression', variables.userId, variables.formationId],
        ['teacher-messages', variables.lessonId, variables.formationId], 
        ['teacher-student-messages', variables.formationId, variables.userId, variables.lessonId],
        ['teacher-discussions-with-unread', variables.formationId],
        ['lesson-unlocking'],
        ['unread-messages-by-level', variables.formationId]
      ];

      // Forcer le refresh des queries pour que les nouveaux messages système apparaissent
      // et mettre à jour les compteurs de messages non lus
      queriesToInvalidate.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
        queryClient.refetchQueries({ queryKey });
      });
      
      // Invalider aussi le compteur global des messages non lus
      queryClient.invalidateQueries({ 
        queryKey: ['unread-messages-badge', variables.formationId] 
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
