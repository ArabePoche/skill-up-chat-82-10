// Hook: gestion des réactions d'emoji sur les messages de conversation
// Rôle: fournir les réactions d'un message et une mutation pour toggler une réaction (ajout/suppression)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ReactionMap = Record<string, { count: number; reactedByMe: boolean }>; // emoji -> infos

export const useConversationMessageReactions = (messageId?: string) => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['conversation-message-reactions', messageId, user?.id],
    queryFn: async () => {
      if (!messageId) return {} as ReactionMap;
      const { data, error } = await supabase
        .from('conversation_message_reactions')
        .select('emoji, user_id')
        .eq('message_id', messageId);
      
      if (error) {
        console.error('Error fetching reactions', error);
        return {} as ReactionMap;
      }
      
      const map: ReactionMap = {};
      for (const row of data || []) {
        if (!map[row.emoji]) map[row.emoji] = { count: 0, reactedByMe: false };
        map[row.emoji].count += 1;
        if (row.user_id === user?.id) map[row.emoji].reactedByMe = true;
      }
      return map;
    },
    enabled: !!messageId,
    staleTime: 0,
  });

  return query;
};

export const useToggleConversationReaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user) throw new Error('User not authenticated');
      
      // Vérifier si l'utilisateur a déjà cette réaction
      const { data: existing } = await supabase
        .from('conversation_message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing) {
        // Supprimer la réaction
        const { error } = await supabase
          .from('conversation_message_reactions')
          .delete()
          .eq('id', existing.id);
        
        if (error) throw error;
        return { action: 'removed' as const };
      } else {
        // Ajouter la réaction au message
        const { error } = await supabase
          .from('conversation_message_reactions')
          .insert({ message_id: messageId, user_id: user.id, emoji });
        
        if (error) throw error;
        return { action: 'added' as const };
      }
    },
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversation-message-reactions', variables.messageId] });
    },
  });
};
