
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { notifyFormationTeachers } from '@/utils/notifyFormationTeachers';

/**
 * Hook unifié pour envoyer des messages dans le contexte de groupe/promotion
 * Supporte les messages normaux, soumissions d'exercices et messages de niveau
 */
export const useSendPromotionMessage = (formationId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      lessonId, 
      levelId,
      content, 
      messageType = 'text',
      fileUrl,
      fileType,
      fileName,
      isExerciseSubmission = false,
      exerciseId,
      promotionId,
      receiverId,
      repliedToMessageId
    }: {
      lessonId?: string;
      levelId?: string;
      content: string;
      messageType?: string;
      fileUrl?: string;
      fileType?: string;
      fileName?: string;
      isExerciseSubmission?: boolean;
      exerciseId?: string;
      promotionId?: string;
      receiverId?: string;
      repliedToMessageId?: string;
    }) => {
      if (!user?.id) {
        throw new Error('Utilisateur non authentifié');
      }

      let finalLessonId = lessonId;

      // Si levelId est fourni mais pas lessonId, récupérer la première leçon du niveau
      if (levelId && !lessonId) {
        const { data: firstLesson, error: lessonError } = await supabase
          .from('lessons')
          .select('id')
          .eq('level_id', levelId)
          .order('order_index', { ascending: true })
          .limit(1)
          .single();

        if (lessonError || !firstLesson) {
          console.error('Error fetching first lesson:', lessonError);
          throw new Error('Could not find lesson for this level');
        }

        finalLessonId = firstLesson.id;
      }

      if (!finalLessonId) {
        throw new Error('Lesson ID is required');
      }

      console.log('📤 Sending promotion message:', { 
        lessonId: finalLessonId,
        levelId,
        formationId, 
        isExerciseSubmission, 
        exerciseId,
        promotionId 
      });

      // Insérer le message dans lesson_messages
      const { data, error } = await supabase
        .from('lesson_messages')
        .insert({
          lesson_id: finalLessonId,
          formation_id: formationId,
          level_id: levelId,
          promotion_id: promotionId,
          sender_id: user.id,
          receiver_id: receiverId,
          content,
          message_type: messageType,
          file_url: fileUrl,
          file_type: fileType,
          file_name: fileName,
          is_exercise_submission: isExerciseSubmission,
          exercise_id: exerciseId,
          replied_to_message_id: repliedToMessageId,
          is_system_message: false
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
            lesson_id: finalLessonId,
            status: 'in_progress',
            exercise_completed: false
          });

        if (progressError) {
          console.error('Error updating lesson progress:', progressError);
        }
      }
      
      console.log('✅ Promotion message sent successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      // Invalider les requêtes pour actualiser les messages et la progression
      queryClient.invalidateQueries({ 
        queryKey: ['promotion-messages'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['group-chat-messages'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['group-progression'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['student-progression'] 
      });
      
      if (data.is_exercise_submission) {
        toast.success('Exercice soumis avec succès !');
      } else {
        toast.success('Message envoyé');
      }

      // Notifier les profs de la formation (fire & forget)
      if (user?.id) {
        const senderName = user.user_metadata?.first_name
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
          : user.email || 'Un élève';
        notifyFormationTeachers({
          formationId,
          senderName,
          type: data.is_exercise_submission ? 'exercise' : 'message',
          contentPreview: data.content,
          senderId: user.id,
        });
      }
    },
    onError: (error) => {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    },
  });
};
