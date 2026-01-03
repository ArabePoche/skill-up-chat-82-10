/**
 * Hook pour gérer les messages avec stockage local
 * Similaire à WhatsApp : cache local + sync en arrière-plan
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { messageStore } from '../stores/MessageStore';
import { StoredMessage, StoredProfile } from '../types';
import { useAuth } from '@/hooks/useAuth';

interface UseLocalMessagesOptions {
  lessonId: string;
  formationId: string;
  promotionId?: string;
  enabled?: boolean;
}

interface UseLocalMessagesReturn {
  messages: StoredMessage[];
  isLoading: boolean;
  isFromCache: boolean;
  isSyncing: boolean;
  error: Error | null;
  sendMessage: (content: string, type?: 'text' | 'audio' | 'file') => Promise<void>;
  refreshMessages: () => Promise<void>;
  pendingCount: number;
}

export const useLocalMessages = ({
  lessonId,
  formationId,
  promotionId,
  enabled = true,
}: UseLocalMessagesOptions): UseLocalMessagesReturn => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  
  const isOnlineRef = useRef(navigator.onLine);
  const conversationKey = messageStore.getConversationKey(lessonId, formationId, user?.id);

  // Écoute le statut en ligne
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      syncPendingMessages();
    };
    const handleOffline = () => {
      isOnlineRef.current = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Charge les messages du cache local d'abord
  const loadFromCache = useCallback(async () => {
    try {
      const cached = await messageStore.getMessagesByLesson(lessonId, formationId, user?.id);
      if (cached.length > 0) {
        setMessages(cached);
        setIsFromCache(true);
        console.log('📦 Loaded from cache:', cached.length, 'messages');
      }
    } catch (err) {
      console.error('Error loading from cache:', err);
    }
  }, [lessonId, formationId, user?.id]);

  // Sync avec le serveur
  const syncWithServer = useCallback(async () => {
    if (!isOnlineRef.current || !user) return;

    setIsSyncing(true);
    try {
      // Récupérer le dernier timestamp pour sync différentielle
      const lastSyncTime = await messageStore.getLastMessageTime(conversationKey);
      
      let query = supabase
        .from('lesson_messages')
        .select(`
          *,
          sender:profiles!lesson_messages_sender_id_fkey (
            id, first_name, last_name, username, avatar_url
          )
        `)
        .eq('lesson_id', lessonId)
        .eq('formation_id', formationId)
        .order('created_at', { ascending: true });

      // Sync différentielle : ne récupère que les nouveaux messages
      if (lastSyncTime) {
        const lastSyncDate = new Date(lastSyncTime).toISOString();
        query = query.gt('created_at', lastSyncDate);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        // Convertir en format StoredMessage
        const newMessages: StoredMessage[] = data.map(msg => ({
          id: msg.id,
          conversationKey,
          content: msg.content,
          senderId: msg.sender_id,
          senderProfile: msg.sender ? {
            id: msg.sender.id,
            firstName: msg.sender.first_name,
            lastName: msg.sender.last_name,
            username: msg.sender.username,
            avatarUrl: msg.sender.avatar_url,
            updatedAt: Date.now(),
          } : undefined,
          receiverId: msg.receiver_id,
          createdAt: new Date(msg.created_at).getTime(),
          isPending: false,
          isRead: msg.is_read || false,
          messageType: msg.message_type as any || 'text',
          fileUrl: msg.file_url,
          fileName: msg.file_name,
          fileType: msg.file_type,
          serverSynced: true,
          localId: msg.id,
        }));

        // Sauvegarder dans le cache local
        await messageStore.saveMessages(newMessages);

        // Recharger depuis le cache pour avoir tous les messages
        const allCached = await messageStore.getMessagesByLesson(lessonId, formationId, user?.id);
        setMessages(allCached);
        setIsFromCache(false);

        console.log('✅ Synced', newMessages.length, 'new messages');
      }
    } catch (err) {
      console.error('Sync error:', err);
      setError(err as Error);
    } finally {
      setIsSyncing(false);
    }
  }, [lessonId, formationId, user, conversationKey]);

  // Sync les messages en attente
  const syncPendingMessages = useCallback(async () => {
    if (!isOnlineRef.current || !user) return;

    try {
      const pending = await messageStore.getPendingMessages();
      setPendingCount(pending.length);

      for (const msg of pending) {
        try {
          const { data, error: sendError } = await supabase
            .from('lesson_messages')
            .insert({
              content: msg.content,
              sender_id: user.id,
              lesson_id: lessonId,
              formation_id: formationId,
              promotion_id: promotionId,
              message_type: msg.messageType,
              file_url: msg.fileUrl,
              file_name: msg.fileName,
              file_type: msg.fileType,
            })
            .select()
            .single();

          if (sendError) throw sendError;

          // Marquer comme synchronisé
          await messageStore.markMessageSynced(msg.localId, data.id);
          setPendingCount(prev => Math.max(0, prev - 1));
        } catch (err) {
          console.error('Error syncing pending message:', err);
        }
      }
    } catch (err) {
      console.error('Error getting pending messages:', err);
    }
  }, [user, lessonId, formationId, promotionId]);

  // Envoi de message (avec support offline)
  const sendMessage = useCallback(async (
    content: string,
    type: 'text' | 'audio' | 'file' = 'text'
  ) => {
    if (!user) return;

    const newMessage: Omit<StoredMessage, 'serverSynced'> = {
      id: '', // Sera généré
      conversationKey,
      content,
      senderId: user.id,
      senderProfile: {
        id: user.id,
        firstName: user.user_metadata?.first_name,
        lastName: user.user_metadata?.last_name,
        updatedAt: Date.now(),
      },
      createdAt: Date.now(),
      isPending: true,
      isRead: false,
      messageType: type,
      localId: '',
    };

    // Ajoute localement d'abord (optimistic update)
    const localId = await messageStore.addPendingMessage(newMessage);
    
    // Met à jour l'UI immédiatement
    const updatedMessages = await messageStore.getMessagesByLesson(lessonId, formationId, user.id);
    setMessages(updatedMessages);
    setPendingCount(prev => prev + 1);

    // Sync si en ligne
    if (isOnlineRef.current) {
      try {
        const { data, error: sendError } = await supabase
          .from('lesson_messages')
          .insert({
            content,
            sender_id: user.id,
            lesson_id: lessonId,
            formation_id: formationId,
            promotion_id: promotionId,
            message_type: type,
          })
          .select()
          .single();

        if (sendError) throw sendError;

        await messageStore.markMessageSynced(localId, data.id);
        setPendingCount(prev => Math.max(0, prev - 1));

        // Rafraîchir
        const refreshed = await messageStore.getMessagesByLesson(lessonId, formationId, user.id);
        setMessages(refreshed);
      } catch (err) {
        console.error('Error sending message:', err);
        // Le message reste en pending pour sync ultérieure
      }
    }
  }, [user, conversationKey, lessonId, formationId, promotionId]);

  // Rafraîchissement manuel
  const refreshMessages = useCallback(async () => {
    await syncWithServer();
    await syncPendingMessages();
  }, [syncWithServer, syncPendingMessages]);

  // Chargement initial
  useEffect(() => {
    if (!enabled || !user) return;

    const init = async () => {
      setIsLoading(true);
      await loadFromCache();
      await syncWithServer();
      await syncPendingMessages();
      setIsLoading(false);
    };

    init();
  }, [enabled, user, loadFromCache, syncWithServer, syncPendingMessages]);

  // Écoute realtime
  useEffect(() => {
    if (!enabled || !user) return;

    const channel = supabase
      .channel(`lesson-messages-${lessonId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lesson_messages',
          filter: `lesson_id=eq.${lessonId}`,
        },
        async (payload) => {
          // Ne pas traiter nos propres messages
          if (payload.new.sender_id === user.id) return;

          // Ajouter au cache et rafraîchir
          await syncWithServer();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, user, lessonId, syncWithServer]);

  return {
    messages,
    isLoading,
    isFromCache,
    isSyncing,
    error,
    sendMessage,
    refreshMessages,
    pendingCount,
  };
};
