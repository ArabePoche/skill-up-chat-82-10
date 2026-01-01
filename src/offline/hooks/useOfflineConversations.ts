/**
 * Hook pour gérer le téléchargement automatique des conversations (messages) entre utilisateurs
 * Les messages sont synchronisés automatiquement quand l'utilisateur est en ligne
 */

import { useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { offlineStore } from '../utils/offlineStore';
import { useOfflineSync } from './useOfflineSync';

const CONVERSATIONS_STORE = 'conversations';
const SYNC_INTERVAL = 30000; // 30 secondes

interface ConversationMessage {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string | null;
  created_at: string;
  is_read: boolean;
}

/**
 * Hook pour synchroniser automatiquement les messages de conversation
 */
export const useOfflineConversations = (userId: string | undefined) => {
  const { isOnline } = useOfflineSync();
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);

  // Récupère les conversations de l'utilisateur
  const { data: conversations, refetch } = useQuery({
    queryKey: ['user-conversations', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as ConversationMessage[];
    },
    enabled: !!userId && isOnline,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Sauvegarde les messages dans IndexedDB
  const saveConversationsOffline = useCallback(async (messages: ConversationMessage[]) => {
    if (!messages || messages.length === 0) return;

    try {
      // Grouper les messages par conversation (paire sender/receiver)
      const conversationGroups = new Map<string, ConversationMessage[]>();
      
      messages.forEach(msg => {
        // Créer une clé unique pour chaque paire de conversation
        const participants = [msg.sender_id, msg.receiver_id].filter(Boolean).sort();
        const conversationKey = participants.join('_');
        
        if (!conversationGroups.has(conversationKey)) {
          conversationGroups.set(conversationKey, []);
        }
        conversationGroups.get(conversationKey)!.push(msg);
      });

      // Sauvegarder chaque groupe de conversation
      for (const [conversationKey, msgs] of conversationGroups) {
        await offlineStore.cacheQuery(
          `conversation:${conversationKey}`,
          msgs,
          1000 * 60 * 60 * 24 * 7 // Cache pour 7 jours
        );
      }

      // Sauvegarder aussi la liste complète pour l'utilisateur
      await offlineStore.cacheQuery(
        `user-conversations:${userId}`,
        messages,
        1000 * 60 * 60 * 24 * 7
      );

      console.log(`✅ ${messages.length} messages de conversation sauvegardés offline`);
    } catch (error) {
      console.error('❌ Erreur sauvegarde conversations offline:', error);
    }
  }, [userId]);

  // Récupère les messages offline
  const getOfflineConversations = useCallback(async (): Promise<ConversationMessage[]> => {
    if (!userId) return [];
    
    try {
      const cached = await offlineStore.getCachedQuery(`user-conversations:${userId}`);
      return cached || [];
    } catch (error) {
      console.error('❌ Erreur lecture conversations offline:', error);
      return [];
    }
  }, [userId]);

  // Récupère les messages d'une conversation spécifique offline
  const getOfflineConversationWith = useCallback(async (otherUserId: string): Promise<ConversationMessage[]> => {
    if (!userId) return [];
    
    try {
      const participants = [userId, otherUserId].sort();
      const conversationKey = participants.join('_');
      const cached = await offlineStore.getCachedQuery(`conversation:${conversationKey}`);
      return cached || [];
    } catch (error) {
      console.error('❌ Erreur lecture conversation offline:', error);
      return [];
    }
  }, [userId]);

  // Synchronisation automatique quand en ligne
  useEffect(() => {
    if (!isOnline || !userId) return;

    const syncConversations = async () => {
      const now = Date.now();
      // Éviter les syncs trop fréquentes
      if (now - lastSyncRef.current < SYNC_INTERVAL) return;
      
      lastSyncRef.current = now;
      
      try {
        const result = await refetch();
        if (result.data) {
          await saveConversationsOffline(result.data);
        }
      } catch (error) {
        console.error('❌ Erreur sync conversations:', error);
      }
    };

    // Sync initial
    syncConversations();

    // Sync périodique
    syncIntervalRef.current = setInterval(syncConversations, SYNC_INTERVAL);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, userId, refetch, saveConversationsOffline]);

  // Écoute les nouveaux messages en temps réel et les sauvegarde
  useEffect(() => {
    if (!userId || !isOnline) return;

    const channel = supabase
      .channel('conversation-sync')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `sender_id=eq.${userId}`,
        },
        async (payload) => {
          // Nouveau message envoyé, rafraîchir le cache
          const result = await refetch();
          if (result.data) {
            await saveConversationsOffline(result.data);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          // Nouveau message reçu, rafraîchir le cache
          const result = await refetch();
          if (result.data) {
            await saveConversationsOffline(result.data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isOnline, refetch, saveConversationsOffline]);

  return {
    conversations: conversations || [],
    isOnline,
    getOfflineConversations,
    getOfflineConversationWith,
    syncNow: async () => {
      lastSyncRef.current = 0;
      const result = await refetch();
      if (result.data) {
        await saveConversationsOffline(result.data);
      }
    },
  };
};
