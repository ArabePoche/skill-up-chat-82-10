
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * Hook pour envoyer des messages dans le contexte de groupe/promotion
 * Intègre la logique de progression automatique des leçons/exercices
 */
export const useSendPromotionMessage = (formationId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      lessonId, 
      content, 
      messageType = 'text',
      fileUrl,
      fileType,
      fileName,
      isExerciseSubmission = false,
      exerciseId,
      promotionId
    }: {
      lessonId: string;
      content: string;
      messageType?: string;
      fileUrl?: string;
      fileType?: string;
      fileName?: string;
      isExerciseSubmission?: boolean;
      exerciseId?: string;
      promotionId?: string;
    }) => {
      if (!user?.id) {
        throw new Error('Utilisateur non authentifié');
      }

      console.log('Sending promotion message:', { 
        lessonId, 
        formationId, 
        isExerciseSubmission, 
        exerciseId,
        promotionId 
      });

      // Insérer le message dans lesson_messages
      const { data, error } = await supabase
        .from('lesson_messages')
        .insert({
          lesson_id: lessonId,
          formation_id: formationId,
          promotion_id: promotionId,
          sender_id: user.id,
          content,
          message_type: messageType,
          file_url: fileUrl,
          file_type: fileType,
          file_name: fileName,
          is_exercise_submission: isExerciseSubmission,
          exercise_id: exerciseId,
          exercise_status: isExerciseSubmission ? null : undefined
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending promotion message:', error);
        throw error;
      }

      // Si c'est une soumission d'exercice, mettre à jour le progrès de la leçon
      if (isExerciseSubmission && exerciseId) {
        const { error: progressError } = await supabase
          .from('user_lesson_progress')
          .upsert({
            user_id: user.id,
            lesson_id: lessonId,
            status: 'in_progress',
            exercise_completed: false
          });

        if (progressError) {
          console.error('Error updating lesson progress:', progressError);
        }
      }
      
      console.log('Promotion message sent:', data);
      return data;
    },
    onSuccess: (data) => {
      // Invalider les requêtes pour actualiser les messages et la progression
      queryClient.invalidateQueries({ 
        queryKey: ['promotion-messages', data.lesson_id, data.formation_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['group-progression'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['student-progression'] 
      });
      
      if (data.is_exercise_submission) {
        toast.success('Exercice soumis avec succès !');
      }
    },
    onError: (error) => {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    },
  });
};
