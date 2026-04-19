import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { getCallLogPresentation, parseCallLogContent } from '@/utils/conversationCallLog';
import {
  getForwardedMessagePreview,
  stripForwardedMessageMarker,
} from '@/utils/forwardedConversationMessage';

const SYSTEM_USER_ID = '4c32c988-3b19-4eca-87cb-0e0595fd7fbb';

/**
 * Hook pour charger les conversations privées entre amis (messagerie sociale).
 * Totalement indépendant des formations — aucun lien avec le chat pédagogique.
 * Utilisé en lazy loading quand l'utilisateur ouvre l'onglet Conversations.
 */
export const useConversationsList = (enabled: boolean = false) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Realtime: écouter les nouveaux messages pour rafraîchir la liste
  useEffect(() => {
    if (!enabled || !user?.id) return;

    const channel = supabase
      .channel(`conv-list-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations-list', user.id] });
          queryClient.invalidateQueries({ queryKey: ['unread-counts', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, user?.id, queryClient]);

  return useQuery({
    queryKey: ['conversations-list', user?.id],
    staleTime: 30000,
    refetchInterval: 60000,
    queryFn: async () => {
      if (!user?.id) return [];

      // Marquer tous les messages reçus comme "livrés" (deux coches grises)
      // Cela se fait dès que l'utilisateur ouvre la liste des conversations
      await supabase
        .from('conversation_messages')
        .update({ is_delivered: true })
        .eq('receiver_id', user.id)
        .eq('is_delivered', false);

      // Récupérer uniquement les messages privés (conversation_messages)
      const { data: directMessages } = await supabase
        .from('conversation_messages')
        .select(`
          id,
          story_id,
          sender_id,
          receiver_id,
          content,
          created_at,
          is_read,
          is_delivered
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      const conversations = [];

      if (directMessages && directMessages.length > 0) {
        const conversationsMap = new Map();
        const unreadCountMap = new Map<string, number>();

        for (const msg of directMessages) {
          const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

          // Exclure le système
          if (otherUserId === SYSTEM_USER_ID) continue;

          // Compter les non lus
          if (msg.receiver_id === user.id && !msg.is_read) {
            const count = unreadCountMap.get(otherUserId) || 0;
            unreadCountMap.set(otherUserId, count + 1);
          }

          // Une seule conversation par interlocuteur
          if (!conversationsMap.has(otherUserId)) {
            conversationsMap.set(otherUserId, { otherUserId, messages: [] });
          }

          conversationsMap.get(otherUserId).messages.push(msg);
        }

        // Récupérer les profils en une seule requête
        const userIds = Array.from(conversationsMap.keys());

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, username, avatar_url')
            .in('id', userIds);

          const profilesMap = new Map();
          profiles?.forEach(profile => profilesMap.set(profile.id, profile));

          for (const [otherUserId, convData] of conversationsMap) {
            const profile = profilesMap.get(otherUserId);
            const lastMsg = convData.messages[convData.messages.length - 1];

            const otherName = profile
              ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username || 'Utilisateur'
              : 'Utilisateur';

            let lastMessage = '';
            const normalizedContent = stripForwardedMessageMarker(lastMsg.content);
            const callLog = parseCallLogContent(normalizedContent);
            if (callLog) {
              const presentation = getCallLogPresentation(callLog, user.id);
              // Si le log comprend une icône/présentation, on simplifie pour la liste
              lastMessage = presentation.title;
            } else {
              const previewContent = getForwardedMessagePreview(lastMsg.content);
              lastMessage = previewContent.substring(0, 50);
              if (previewContent.length > 50) lastMessage += '...';
            }

            const createdAt = new Date(lastMsg.created_at);
            const timeLabel = createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Déterminer si le dernier message est envoyé par moi et son statut
            const lastMsgIsOwn = lastMsg.sender_id === user.id;

            conversations.push({
              id: `user-${otherUserId}`,
              name: otherName,
              lastMessage,
              timestamp: timeLabel,
              created_at: lastMsg.created_at,
              unread: unreadCountMap.get(otherUserId) || 0,
              avatar: profile?.avatar_url || '💬',
              online: false,
              type: 'direct_message',
              otherUserId: otherUserId,
              lastMsgIsOwn,
              lastMsgIsDelivered: lastMsg.is_delivered ?? false,
              lastMsgIsRead: lastMsg.is_read ?? false,
            });
          }
        }
      }

      // Trier par date du plus récent au plus ancien
      return conversations.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
    },
    enabled: enabled && !!user?.id,
  });
};
