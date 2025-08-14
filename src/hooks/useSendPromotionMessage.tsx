
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStudentPromotion } from './usePromotions';

export const useSendPromotionMessage = (formationId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: studentPromotion } = useStudentPromotion(formationId);

  return useMutation({
    mutationFn: async ({ 
      lessonId, 
      content, 
      messageType = 'text',
      fileUrl,
      fileType,
      fileName,
      isExerciseSubmission = false,
      receiverId,
      exerciseId
    }: {
      lessonId: string;
      content: string;
      messageType?: string;
      fileUrl?: string;
      fileType?: string;
      fileName?: string;
      isExerciseSubmission?: boolean;
      receiverId?: string;
      exerciseId?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      console.log('Sending promotion message:', { 
        lessonId, 
        formationId, 
        content, 
        messageType, 
        promotionId: studentPromotion?.promotion_id 
      });

      const { data, error } = await supabase
        .from('lesson_messages')
        .insert({
          lesson_id: lessonId,
          formation_id: formationId,
          promotion_id: studentPromotion?.promotion_id || null,
          sender_id: user.id,
          receiver_id: receiverId,
          content,
          message_type: messageType,
          file_url: fileUrl,
          file_type: fileType,
          file_name: fileName,
          is_exercise_submission: isExerciseSubmission,
          exercise_id: exerciseId,
          is_system_message: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending promotion message:', error);
        throw error;
      }
      
      console.log('Promotion message sent:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['promotion-messages', data.lesson_id, data.formation_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['student-progression', user?.id, formationId] 
      });
    },
  });
};
