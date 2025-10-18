import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentPromotion } from './usePromotion';

// ID système fourni
const SYSTEM_USER_ID = '4c32c988-3b19-4eca-87cb-0e0595fd7fbb';

export const useSendLessonMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      lessonId, 
      formationId, 
      content, 
      messageType = 'text',
      fileUrl,
      fileType,
      fileName,
      isExerciseSubmission = false,
      receiverId,
      isSystemMessage = false,
      promotionId
    }: {
      lessonId: string;
      formationId: string;
      content: string;
      messageType?: string;
      fileUrl?: string;
      fileType?: string;
      fileName?: string;
      isExerciseSubmission?: boolean;
      receiverId?: string;
      isSystemMessage?: boolean;
      promotionId?: string;
    }) => {
      let senderId: string | null = null;
      
      // Si c'est un message système, utiliser l'ID système, sinon récupérer l'utilisateur authentifié
      if (isSystemMessage) {
        senderId = SYSTEM_USER_ID;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        senderId = user.id;
      }

      

      const { data, error } = await supabase
        .from('lesson_messages')
        .insert({
          lesson_id: lessonId,
          formation_id: formationId,
          promotion_id: promotionId,
          sender_id: senderId,
          receiver_id: receiverId,
          content,
          message_type: messageType,
          file_url: fileUrl,
          file_type: fileType,
          file_name: fileName,
          is_exercise_submission: isExerciseSubmission,
          is_system_message: isSystemMessage
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }
      
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['promotion-messages', data.lesson_id, data.formation_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['teacher-messages', data.lesson_id, data.formation_id] 
      });
    },
  });
};

export const useUpdateExerciseStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      messageId, 
      status 
    }: {
      messageId: string;
      status: 'approved' | 'rejected';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('lesson_messages')
        .update({ 
          exercise_status: status,
          validated_by_teacher_id: user.id
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) {
        console.error('Error updating exercise status:', error);
        throw error;
      }
      
      console.log('Exercise status updated:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['student-messages', data.lesson_id, data.formation_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['teacher-messages', data.lesson_id, data.formation_id] 
      });
    },
  });
};
