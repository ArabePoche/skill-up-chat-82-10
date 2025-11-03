/**
 * Hook pour mettre à jour une soumission d'exercice existante
 * Permet de modifier le contenu et/ou le fichier d'une soumission
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useUpdateExerciseSubmission = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      messageId,
      content,
      file
    }: {
      messageId: string;
      content: string;
      file?: File;
    }) => {
      if (!user?.id) {
        throw new Error('Utilisateur non authentifié');
      }

      // Récupérer le message existant pour obtenir les informations nécessaires
      const { data: existingMessage, error: fetchError } = await supabase
        .from('lesson_messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (fetchError || !existingMessage) {
        console.error('Error fetching existing message:', fetchError);
        throw new Error('Message introuvable');
      }

      // Vérifier que l'utilisateur est bien l'auteur du message
      if (existingMessage.sender_id !== user.id) {
        throw new Error('Vous n\'êtes pas autorisé à modifier cette soumission');
      }

      let fileUrl = existingMessage.file_url;
      let fileName = existingMessage.file_name;
      let fileType = existingMessage.file_type;

      // Si un nouveau fichier est fourni, l'uploader
      if (file) {
        console.log('Uploading updated exercise file:', file.name, file.type);
        
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${existingMessage.lesson_id}/${existingMessage.exercise_id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('students_exercises_submission_files')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading updated exercise file:', uploadError);
          throw uploadError;
        }

        // Obtenir l'URL publique du fichier
        const { data: { publicUrl } } = supabase.storage
          .from('students_exercises_submission_files')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileName = file.name;
        fileType = file.type;
        
        console.log('Updated exercise file uploaded successfully:', { fileUrl, fileName, fileType });
      }

      console.log('Updating exercise submission:', { messageId, content });

      // Mettre à jour la soumission d'exercice
      const { data, error } = await supabase
        .from('lesson_messages')
        .update({
          content: content,
          message_type: fileUrl ? 'file' : 'text',
          file_url: fileUrl,
          file_type: fileType,
          file_name: fileName,
          exercise_status: 'pending', // Remettre le statut à pending après modification
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) {
        console.error('Error updating exercise submission:', error);
        throw error;
      }
      
      console.log('Exercise submission updated:', data);
      return data;
    },
    onSuccess: (data) => {
      // Invalider toutes les clés possibles pour les messages
      queryClient.invalidateQueries({ 
        queryKey: ['student-messages', data.lesson_id, data.formation_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['teacher-messages', data.lesson_id, data.formation_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['lesson-messages', data.lesson_id, data.formation_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['individual-messages', data.lesson_id, data.formation_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['promotion-messages', data.lesson_id, data.formation_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['group-chat-messages', data.formation_id, data.level_id] 
      });
      toast.success('Soumission mise à jour avec succès');
    },
    onError: (error: Error) => {
      console.error('Error updating exercise submission:', error);
      toast.error('Erreur lors de la mise à jour de la soumission');
    }
  });
};
