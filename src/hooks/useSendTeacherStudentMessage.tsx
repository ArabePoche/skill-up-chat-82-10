
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useSendTeacherStudentMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      formationId, 
      studentId,
      lessonId,
      content, 
      messageType = 'text',
      fileUrl,
      fileType,
      fileName
    }: {
      formationId: string;
      studentId: string;
      lessonId: string;
      content: string;
      messageType?: string;
      fileUrl?: string;
      fileType?: string;
      fileName?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      if (!lessonId) throw new Error('lesson_id is required');

      console.log('Sending teacher-student message:', { formationId, studentId, lessonId, content, messageType });

      // Vérifier que l'utilisateur est bien professeur de cette formation via teacher_formations
      const { data: teacherCheck } = await supabase
        .from('teachers')
        .select(`
          id,
          teacher_formations!inner (
            formation_id
          )
        `)
        .eq('user_id', user.id)
        .eq('teacher_formations.formation_id', formationId)
        .single();

      if (!teacherCheck) {
        throw new Error('User is not a teacher for this formation');
      }

      // Enregistrer le message du professeur
      const messageData: any = {
        lesson_id: lessonId,
        formation_id: formationId,
        sender_id: user.id,
        receiver_id: studentId,
        content,
        message_type: messageType,
      };

      // Ajouter les données de fichier si présentes
      if (fileUrl) messageData.file_url = fileUrl;
      if (fileType) messageData.file_type = fileType;
      if (fileName) messageData.file_name = fileName;

      const { data, error } = await supabase
        .from('lesson_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('Error sending teacher-student message:', error);
        throw error;
      }
      
      console.log('Teacher-student message sent:', data);
      return data;
    },
    onSuccess: (data) => {
      // Invalider les queries pour rafraîchir les messages
      queryClient.invalidateQueries({ 
        queryKey: ['teacher-student-messages', data.formation_id, data.receiver_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['teacher-discussions-with-unread', data.formation_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['student-messages', data.lesson_id, data.formation_id] 
      });
    },
  });
};
