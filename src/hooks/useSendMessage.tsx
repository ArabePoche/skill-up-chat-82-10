
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useSendMessage = (lessonId: string, formationId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      content, 
      messageType = 'text',
      file,
      isExerciseSubmission = false,
      repliedToMessageId 
    }: {
      content: string;
      messageType?: string;
      file?: File & { uploadUrl?: string };
      isExerciseSubmission?: boolean;
      repliedToMessageId?: string;
    }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      let fileUrl = null;
      let fileName = null;
      let fileType = null;

      // Check if file has already been uploaded (has uploadUrl property)
      if (file && (file as any).uploadUrl) {
        fileUrl = (file as any).uploadUrl;
        fileName = file.name;
        fileType = file.type;
        console.log('Using pre-uploaded file:', { fileUrl, fileName, fileType });
      } else if (file) {
        // Fallback: upload to students_exercises_submission_files bucket if not pre-uploaded
        console.log('Uploading file to students_exercises_submission_files bucket:', file.name, file.type);
        
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${lessonId}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('students_exercises_submission_files')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('students_exercises_submission_files')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileName = file.name;
        fileType = file.type;
        
        console.log('File uploaded successfully to students_exercises_submission_files:', { fileUrl, fileName, fileType });
      }

      console.log('Sending message:', { content, messageType, fileUrl, fileName, fileType });

      const { data, error } = await supabase
        .from('lesson_messages')
        .insert({
          lesson_id: lessonId,
          formation_id: formationId,
          sender_id: user.id,
          content,
          message_type: messageType,
          file_url: fileUrl,
          file_name: fileName,
          file_type: fileType,
          is_exercise_submission: false, // Only true for real exercise submissions
          replied_to_message_id: repliedToMessageId || null // Nouveau champ pour les réponses
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }
      
      console.log('Message sent:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['student-messages', lessonId, formationId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['teacher-messages', lessonId, formationId] 
      });
    },
  });
};
