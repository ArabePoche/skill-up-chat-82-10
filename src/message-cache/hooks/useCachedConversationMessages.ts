import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { localMessageStore } from '../utils/localMessageStore';
import { useState, useEffect } from 'react';

/**
 * Hook optimisé avec cache local pour les messages de conversation privée
 */
export const useCachedConversationMessages = (receiverId: string | undefined) => {
  const { user } = useAuth();
  const [cachedMessages, setCachedMessages] = useState<any[] | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(true);

  // Utiliser un ID virtuel pour les conversations privées
  const conversationKey = receiverId && user?.id 
    ? `conversation_${[user.id, receiverId].sort().join('_')}` 
    : undefined;

  useEffect(() => {
    if (!conversationKey || !user?.id) {
      setIsLoadingCache(false);
      return;
    }

    const loadCache = async () => {
      const cached = await localMessageStore.getMessages(
        conversationKey,
        'private_chat',
        user.id
      );
      setCachedMessages(cached);
      setIsLoadingCache(false);
    };

    loadCache();
  }, [conversationKey, user?.id]);

  const query = useQuery({
    queryKey: ['conversation-messages', user?.id, receiverId],
    queryFn: async () => {
      if (!user?.id || !receiverId) return [];

      console.log('🔄 Fetching conversation messages from server...');

      const { data: messages, error } = await supabase
        .from('conversation_messages')
        .select(`
          *,
          sender:profiles!sender_id(
            id,
            first_name,
            last_name,
            username,
            avatar_url
          ),
          receiver:profiles!receiver_id(
            id,
            first_name,
            last_name,
            username,
            avatar_url
          ),
          replied_to_message:replied_to_message_id(
            id,
            content,
            sender_id
          )
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching conversation messages:', error);
        return cachedMessages || [];
      }

      // Sauvegarder dans le cache
      if (conversationKey) {
        await localMessageStore.saveMessages(
          conversationKey,
          'private_chat',
          user.id,
          messages || []
        );
      }

      console.log('✅ Conversation messages synced:', messages?.length || 0);
      return messages || [];
    },
    enabled: !!user?.id && !!receiverId,
    initialData: cachedMessages || undefined,
    refetchInterval: 5000,
    staleTime: 3000,
  });

  return {
    ...query,
    isLoadingFromCache: isLoadingCache,
    hasCachedData: cachedMessages !== null,
  };
};
