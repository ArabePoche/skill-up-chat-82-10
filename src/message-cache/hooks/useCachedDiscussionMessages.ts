import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { localMessageStore } from '../utils/localMessageStore';
import { useEffect, useMemo, useRef } from 'react';
import { useOfflineSync } from '@/offline/hooks/useOfflineSync';

const DISCUSSION_FORMATION_KEY = 'group_chat';

const DISCUSSION_SELECT = `
  *,
  sender:profiles(id, first_name, last_name, username, avatar_url)
`;

/**
 * Hook offline-first pour les messages d'un groupe de discussion.
 *
 * - Les messages cachés sont rendus *immédiatement* depuis le miroir mémoire
 *   au premier rendu : aucun écran "Chargement..." si le groupe a déjà été ouvert.
 * - Une synchronisation réseau s'exécute en parallèle sans bloquer l'UI.
 * - Le résultat serveur remplace progressivement le cache (jamais l'inverse).
 * - Persistance automatique dans IndexedDB pour la session suivante.
 */
export const useCachedDiscussionMessages = (groupId: string | undefined) => {
  const { user } = useAuth();
  const { isOnline } = useOfflineSync();
  const queryClient = useQueryClient();
  const seededRef = useRef<string | null>(null);

  const cacheKey = useMemo(() => {
    if (!groupId) return undefined;
    return `discussion_${groupId}`;
  }, [groupId]);

  const queryKey = useMemo(
    () => ['discussion-messages', groupId] as const,
    [groupId],
  );

  // 1. Lecture synchrone du miroir mémoire pour l'affichage immédiat.
  const memoryCached = useMemo(() => {
    if (!cacheKey || !user?.id) return null;
    return localMessageStore.getMessagesSync(cacheKey, DISCUSSION_FORMATION_KEY, user.id);
  }, [cacheKey, user?.id]);

  // 2. Pré-seed React Query avec le cache mémoire (avant tout fetch).
  if (memoryCached && seededRef.current !== cacheKey) {
    queryClient.setQueryData(queryKey, memoryCached);
    seededRef.current = cacheKey ?? null;
  }

  // 3. Lecture IndexedDB asynchrone en complément.
  useEffect(() => {
    if (!cacheKey || !user?.id) return;
    if (memoryCached) return;

    let cancelled = false;
    localMessageStore
      .getMessages(cacheKey, DISCUSSION_FORMATION_KEY, user.id, !isOnline)
      .then((cached) => {
        if (cancelled || !cached) return;
        const existing = queryClient.getQueryData<any[]>(queryKey);
        if (!existing || existing.length === 0) {
          queryClient.setQueryData(queryKey, cached);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [cacheKey, user?.id, isOnline, queryClient, queryKey, memoryCached]);

  // 4. Fetch parallèle.
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('discussion_messages')
        .select(DISCUSSION_SELECT)
        .eq('discussion_id', groupId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching discussion messages:', error);
        const fallback = queryClient.getQueryData<any[]>(queryKey);
        return fallback || [];
      }

      // Persiste pour les prochaines visites
      if (cacheKey && user?.id) {
        await localMessageStore.saveMessages(
          cacheKey,
          DISCUSSION_FORMATION_KEY,
          user.id,
          data || [],
        );
      }

      return data || [];
    },
    enabled: !!groupId && !!user?.id && isOnline,
    staleTime: 1000 * 30,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: isOnline ? 2 : 0,
  });

  const messages = (query.data ?? memoryCached ?? []) as any[];

  /**
   * Ajoute un message de manière optimiste à la liste (et au cache).
   * Utilisé lors de l'envoi pour ne pas attendre le retour serveur.
   */
  const appendOptimistic = (msg: any) => {
    const current = queryClient.getQueryData<any[]>(queryKey) || [];
    const next = [...current, msg];
    queryClient.setQueryData(queryKey, next);
    if (cacheKey && user?.id) {
      localMessageStore
        .saveMessages(cacheKey, DISCUSSION_FORMATION_KEY, user.id, next)
        .catch(() => {});
    }
  };

  /**
   * Remplace ou ajoute un message dans la liste (par id).
   * Utilisé après un INSERT realtime ou un succès d'envoi.
   */
  const upsertMessage = (msg: any) => {
    const current = queryClient.getQueryData<any[]>(queryKey) || [];
    const idx = current.findIndex((m) => m.id === msg.id);
    let next: any[];
    if (idx >= 0) {
      next = [...current];
      next[idx] = { ...current[idx], ...msg };
    } else {
      next = [...current, msg];
    }
    queryClient.setQueryData(queryKey, next);
    if (cacheKey && user?.id) {
      localMessageStore
        .saveMessages(cacheKey, DISCUSSION_FORMATION_KEY, user.id, next)
        .catch(() => {});
    }
  };

  /**
   * Retire un message (par id) de la liste, par exemple sur erreur d'envoi.
   */
  const removeMessage = (messageId: string) => {
    const current = queryClient.getQueryData<any[]>(queryKey) || [];
    const next = current.filter((m) => m.id !== messageId);
    queryClient.setQueryData(queryKey, next);
    if (cacheKey && user?.id) {
      localMessageStore
        .saveMessages(cacheKey, DISCUSSION_FORMATION_KEY, user.id, next)
        .catch(() => {});
    }
  };

  return {
    messages,
    isInitialLoading: query.isLoading && messages.length === 0,
    isSyncing: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    hasCachedData: !!memoryCached && memoryCached.length > 0,
    appendOptimistic,
    upsertMessage,
    removeMessage,
  };
};
