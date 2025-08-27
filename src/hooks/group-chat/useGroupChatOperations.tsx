
/**
 * Hook pour les opérations de chat en mode groupe
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useGroupChatOperations = (formationId: string, promotionId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: async ({
      levelId,
      content,
      messageType = 'text',
      fileUrl,
      fileType,
      fileName,
      isExerciseSubmission = false,
      exerciseId,
      repliedToMessageId
    }: {
      levelId: string;
      content: string;
      messageType?: string;
      fileUrl?: string;
      fileType?: string;
      fileName?: string;
      isExerciseSubmission?: boolean;
      exerciseId?: string;
      repliedToMessageId?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      console.log('📤 Sending group message:', {
        levelId,
        formationId,
        promotionId,
        content: content.substring(0, 50) + '...',
        messageType,
        isExerciseSubmission
      });

      // Récupérer la première leçon du niveau pour lesson_id
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

      const { data, error } = await supabase
        .from('lesson_messages')
        .insert({
          lesson_id: firstLesson.id,
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
          replied_to_message_id: repliedToMessageId,
          is_system_message: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending group message:', error);
        throw error;
      }

      console.log('✅ Group message sent successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      // Invalider les requêtes de messages du groupe
      queryClient.invalidateQueries({ 
        queryKey: ['group-chat-messages'] 
      });
      
      // Invalider aussi les messages de promotion pour la compatibilité
      queryClient.invalidateQueries({ 
        queryKey: ['promotion-messages'] 
      });
      
      toast.success('Message envoyé');
    },
    onError: (error) => {
      console.error('Error sending group message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    },
  });

  return {
    sendMessage
  };
};
