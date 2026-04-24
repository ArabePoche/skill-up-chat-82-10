import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { localMessageStore } from '../utils/localMessageStore';
import { useEffect, useMemo, useRef } from 'react';
import { useOfflineSync } from '@/offline/hooks/useOfflineSync';

const CONVERSATION_FORMATION_KEY = 'private_chat';

const CONVERSATION_SELECT = `
  id,
  content,
  sender_id,
  receiver_id,
  created_at,
  is_story_reply,
  replied_to_message_id,
  replied_to_message:replied_to_message_id(
    id,
    content,
    sender_id,
    profiles:sender_id(
      first_name,
      last_name,
      username
    ),
    conversation_media(
      id,
      file_type,
      file_name
    )
  ),
  is_read,
  is_delivered,
  profiles:sender_id (
    first_name,
    last_name,
    username,
    avatar_url
  ),
  conversation_media (
    id,
    file_url,
    file_type,
    file_name,
    file_size,
    duration_seconds
  )
`;

/**
 * Hook offline-first pour les messages d'une conversation privée.
 *
 * Comportement type "vraies app de discussion" (WhatsApp / Telegram) :
 * - Les messages cachés sont affichés *instantanément* dès le premier rendu
 *   (lecture synchrone du miroir mémoire pré-chargé au démarrage).
 * - Une synchronisation réseau s'exécute en parallèle, sans bloquer l'UI.
 * - Les nouveaux messages remplacent / complètent les anciens, jamais l'inverse.
 * - En mode hors ligne, le cache reste affiché et utilisable.
 */
export const useCachedConversationMessages = (otherUserId: string | undefined) => {
  const { user } = useAuth();
  const { isOnline } = useOfflineSync();
  const queryClient = useQueryClient();
  const seededRef = useRef<string | null>(null);

  const conversationKey = useMemo(() => {
    if (!otherUserId || !user?.id) return undefined;
    return `conversation_${[user.id, otherUserId].sort().join('_')}`;
  }, [otherUserId, user?.id]);

  const queryKey = useMemo(
    () => ['conversation-messages', otherUserId] as const,
    [otherUserId],
  );

  // 1. Lecture synchrone du miroir mémoire pour l'affichage immédiat.
  const memoryCached = useMemo(() => {
    if (!conversationKey || !user?.id) return null;
    return localMessageStore.getMessagesSync(conversationKey, CONVERSATION_FORMATION_KEY, user.id);
  }, [conversationKey, user?.id]);

  // 2. Si on a un cache mémoire, on le pousse dans React Query pour instant-render.
  //    On le fait avant tout fetch pour qu'aucun spinner n'apparaisse.
  if (memoryCached && seededRef.current !== conversationKey) {
    queryClient.setQueryData(queryKey, memoryCached);
    seededRef.current = conversationKey ?? null;
  }

  // 3. Lecture asynchrone de l'IndexedDB en complément (au cas où le warmup
  //    n'aurait pas encore terminé), puis seed du cache React Query.
  useEffect(() => {
    if (!conversationKey || !user?.id) return;
    if (memoryCached) return; // déjà seedé synchrone

    let cancelled = false;
    localMessageStore
      .getMessages(conversationKey, CONVERSATION_FORMATION_KEY, user.id, !isOnline)
      .then((cached) => {
        if (cancelled || !cached) return;
        // N'écrase pas si la requête a déjà ramené quelque chose
        const existing = queryClient.getQueryData<any[]>(queryKey);
        if (!existing || existing.length === 0) {
          queryClient.setQueryData(queryKey, cached);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [conversationKey, user?.id, isOnline, queryClient, queryKey, memoryCached]);

  // 4. Fetch parallèle : ne bloque jamais l'affichage du cache.
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user?.id || !otherUserId) return [];

      const { data, error } = await supabase
        .from('conversation_messages')
        .select(CONVERSATION_SELECT)
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`,
        )
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching conversation messages:', error);
        // Renvoie le cache existant pour ne pas vider l'écran
        const fallback = queryClient.getQueryData<any[]>(queryKey);
        return fallback || [];
      }

      // Persiste pour les prochaines visites
      if (conversationKey && user?.id) {
        await localMessageStore.saveMessages(
          conversationKey,
          CONVERSATION_FORMATION_KEY,
          user.id,
          data || [],
        );
      }

      return data || [];
    },
    enabled: !!user?.id && !!otherUserId && isOnline,
    // Pas de polling : on s'appuie sur les abonnements realtime déjà mis en place
    staleTime: 1000 * 30,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: isOnline ? 2 : 0,
  });

  const messages = (query.data ?? memoryCached ?? []) as any[];

  return {
    messages,
    // Spinner uniquement quand on a vraiment rien à afficher
    isInitialLoading: query.isLoading && messages.length === 0,
    isSyncing: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    hasCachedData: !!memoryCached && memoryCached.length > 0,
  };
};
