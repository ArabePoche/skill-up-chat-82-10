
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useMarkMessagesAsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      formationId,
      lessonId,
      studentId
    }: {
      formationId: string;
      lessonId: string;
      studentId: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      console.log('Marking messages as read:', { formationId, lessonId, studentId, teacherId: user.id });

      // Utiliser la nouvelle fonction qui marque avec un seul ID de professeur
      const { error } = await supabase.rpc('mark_messages_as_read_by_teacher', {
        p_formation_id: formationId,
        p_lesson_id: lessonId,
        p_student_id: studentId,
        p_teacher_id: user.id
      });

      if (error) {
        console.error('Error marking messages as read:', error);
        throw error;
      }

      console.log('Messages marked as read successfully');
    },
    onSuccess: (_, variables) => {
      // Invalider les queries pour rafraîchir les compteurs
      queryClient.invalidateQueries({ 
        queryKey: ['teacher-discussions-with-unread', variables.formationId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['teacher-student-messages', variables.formationId, variables.studentId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['lesson-messages', variables.lessonId, variables.formationId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['unread-messages-badge', variables.formationId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['unread-messages-by-level', variables.formationId] 
      });
    },
  });
};
