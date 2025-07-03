
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAdminMessages = () => {
  const queryClient = useQueryClient();

  // Récupérer tous les messages pour les admins
  const { data: allMessages = [], isLoading } = useQuery({
    queryKey: ['admin-all-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_messages')
        .select(`
          *,
          sender_profile:profiles!lesson_messages_sender_id_fkey(
            first_name,
            last_name,
            email
          ),
          receiver_profile:profiles!lesson_messages_receiver_id_fkey(
            first_name,
            last_name,
            email
          ),
          lessons(
            title,
            levels(
              title,
              formations(title)
            )
          ),
          exercises(
            title,
            type
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all messages:', error);
        throw error;
      }

      return data;
    }
  });

  // Mutation pour valider un exercice
  const validateExerciseMutation = useMutation({
    mutationFn: async ({
      messageId,
      status,
      feedback
    }: {
      messageId: string;
      status: 'approved' | 'rejected' | 'pending';
      feedback?: string;
    }) => {
      const updateData: any = {
        exercise_status: status,
        updated_at: new Date().toISOString()
      };

      // Si du feedback est fourni, l'ajouter au contenu
      if (feedback) {
        updateData.content = feedback;
      }

      const { error } = await supabase
        .from('lesson_messages')
        .update(updateData)
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-messages'] });
      toast.success('Exercice validé avec succès');
    },
    onError: (error) => {
      console.error('Error validating exercise:', error);
      toast.error('Erreur lors de la validation');
    }
  });

  // Mutation pour envoyer un message système
  const sendSystemMessageMutation = useMutation({
    mutationFn: async ({
      lessonId,
      formationId,
      receiverId,
      content,
      exerciseId
    }: {
      lessonId: string;
      formationId: string;
      receiverId?: string;
      content: string;
      exerciseId?: string;
    }) => {
      const { error } = await supabase
        .from('lesson_messages')
        .insert({
          lesson_id: lessonId,
          formation_id: formationId,
          sender_id: 'system',
          receiver_id: receiverId,
          content,
          message_type: 'system',
          is_system_message: true,
          exercise_id: exerciseId
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-messages'] });
      toast.success('Message système envoyé');
    },
    onError: (error) => {
      console.error('Error sending system message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    }
  });

  return {
    allMessages,
    isLoading,
    validateExercise: validateExerciseMutation.mutate,
    isValidatingExercise: validateExerciseMutation.isPending,
    sendSystemMessage: sendSystemMessageMutation.mutate,
    isSendingMessage: sendSystemMessageMutation.isPending
  };
};
