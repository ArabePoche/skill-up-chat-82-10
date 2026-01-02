import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStudentPromotion } from '@/hooks/usePromotion';
import { useOfflineSync } from '@/offline/hooks/useOfflineSync';
import { offlineStore } from '@/offline/utils/offlineStore';
import { toast } from 'sonner';

export const useSendMessage = (lessonId: string, formationId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: studentPromotion } = useStudentPromotion(formationId);
  const { isOnline } = useOfflineSync();

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

      // Mode hors ligne : sauvegarder le message localement
      if (!isOnline) {
        console.log('📴 Offline - queuing message for later');
        
        const pendingMessage = {
          id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          lesson_id: lessonId,
          formation_id: formationId,
          promotion_id: studentPromotion?.promotion_id || null,
          sender_id: user.id,
          content,
          message_type: messageType,
          file_url: null, // Les fichiers ne peuvent pas être envoyés hors ligne
          file_name: null,
          file_type: null,
          is_exercise_submission: false,
          replied_to_message_id: repliedToMessageId || null,
          created_at: new Date().toISOString(),
          is_pending: true, // Marqueur pour les messages en attente
          profiles: {
            id: user.id,
            first_name: user.user_metadata?.first_name || 'Vous',
            last_name: user.user_metadata?.last_name || '',
            username: user.email?.split('@')[0] || 'user'
          }
        };

        // Sauvegarder dans IndexedDB
        await offlineStore.addPendingMessage(pendingMessage, lessonId, formationId);
        
        // Ajouter une mutation en attente pour la synchronisation
        await offlineStore.addPendingMutation({
          type: 'message',
          payload: {
            lessonId,
            formationId,
            promotionId: studentPromotion?.promotion_id,
            senderId: user.id,
            content,
            messageType,
            repliedToMessageId
          }
        });

        toast.info('Message enregistré', {
          description: 'Il sera envoyé automatiquement quand vous serez en ligne'
        });

        return pendingMessage;
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

      console.log('Sending message with promotion:', { 
        content, 
        messageType, 
        fileUrl, 
        fileName, 
        fileType,
        promotionId: studentPromotion?.promotion_id 
      });

      const { data, error } = await supabase
        .from('lesson_messages')
        .insert({
          lesson_id: lessonId,
          formation_id: formationId,
          promotion_id: studentPromotion?.promotion_id || null, // Ajout du promotion_id
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
      // Invalider toutes les queries liées aux messages
      queryClient.invalidateQueries({ 
        queryKey: ['lesson-messages', lessonId, formationId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['student-messages', lessonId, formationId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['teacher-messages', lessonId, formationId] 
      });
    },
  });
};
