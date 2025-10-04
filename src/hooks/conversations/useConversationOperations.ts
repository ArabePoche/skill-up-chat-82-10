// Hook: opérations sur les messages de conversation (suppression, édition)
// Rôle: fournir des mutations pour supprimer et éditer les messages de conversation
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useDeleteConversationMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ messageId }: { messageId: string }) => {
      const { error } = await supabase
        .from('conversation_messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
      return messageId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages'] });
      toast.success('Message supprimé');
    },
    onError: (error) => {
      console.error('Error deleting message:', error);
      toast.error('Erreur lors de la suppression du message');
    },
  });
};

export const useEditConversationMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const { data, error } = await supabase
        .from('conversation_messages')
        .update({ content })
        .eq('id', messageId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages'] });
      toast.success('Message modifié');
    },
    onError: (error) => {
      console.error('Error editing message:', error);
      toast.error('Erreur lors de la modification du message');
    },
  });
};
