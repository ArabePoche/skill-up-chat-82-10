import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsTeacherInFormation } from '@/hooks/useIsTeacherInFormation';
import { getUsersProgressMap, getCurrentUserProgress } from '@/utils/progressionUtils';
import { localMessageStore } from '../utils/localMessageStore';
import { useOfflineSync } from '@/offline/hooks/useOfflineSync';
import { offlineStore } from '@/offline/utils/offlineStore';
import { useState, useEffect } from 'react';

/**
 * Hook optimisé avec cache local pour les messages de leçon
 * Charge d'abord depuis le cache, puis synchronise avec le serveur
 */
export const useCachedLessonMessages = (
  lessonId: string | undefined,
  formationId: string | undefined
) => {
  const { user } = useAuth();
  const { data: isTeacher = false } = useIsTeacherInFormation(formationId);
  const { isOnline } = useOfflineSync();
  const [cachedMessages, setCachedMessages] = useState<any[] | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(true);

  // Charger depuis le cache au montage (ou en mode offline)
  useEffect(() => {
    if (!lessonId || !formationId || !user?.id) {
      setIsLoadingCache(false);
      return;
    }

    const loadCache = async () => {
      // Charger depuis localMessageStore (cache principal des messages)
      const cached = await localMessageStore.getMessages(lessonId, formationId, user.id, !isOnline);
      
      // Si hors ligne, aussi charger les messages en attente depuis offlineStore
      if (!isOnline) {
        const pendingMessages = await offlineStore.getMessagesByLesson(lessonId);
        if (pendingMessages.length > 0) {
          const allMessages = [...(cached || []), ...pendingMessages];
          // Trier par date
          allMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          setCachedMessages(allMessages);
        } else {
          setCachedMessages(cached);
        }
      } else {
        setCachedMessages(cached);
      }
      setIsLoadingCache(false);
    };

    loadCache();
  }, [lessonId, formationId, user?.id, isOnline]);

  const query = useQuery({
    queryKey: ['lesson-messages', lessonId, formationId, user?.id, isTeacher, isOnline],
    queryFn: async () => {
      if (!lessonId || !formationId || !user?.id) return [];

      // Mode hors ligne : retourner le cache
      if (!isOnline) {
        console.log('📴 Offline - returning cached messages for lesson:', lessonId);
        return cachedMessages || [];
      }

      console.log('🔄 Fetching messages from server...');

      // Les professeurs voient tous les messages
      if (isTeacher) {
        const { data: messages, error } = await supabase
          .from('lesson_messages')
          .select(`
            *,
            profiles!sender_id(
              id,
              first_name,
              last_name,
              username,
              avatar_url,
              is_teacher
            ),
            replied_to_message:replied_to_message_id(
              id,
              content,
              sender_id,
              profiles!sender_id(
                id,
                first_name,
                last_name,
                username
              )
            )
          `)
          .eq('lesson_id', lessonId)
          .eq('formation_id', formationId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching teacher messages:', error);
          return cachedMessages || [];
        }

        // Sauvegarder dans le cache
        await localMessageStore.saveMessages(lessonId, formationId, user.id, messages || []);
        return messages || [];
      }

      // Pour les étudiants : vérifier d'abord leur promotion
      const { data: userPromotion, error: promotionError } = await supabase
        .rpc('get_user_promotion_in_formation', {
          p_user_id: user.id,
          p_formation_id: formationId
        });

      if (promotionError) {
        console.error('Error fetching user promotion:', promotionError);
        return cachedMessages || [];
      }

      // Si pas de promotion : messages individuels uniquement
      if (!userPromotion) {
        const { data: messages, error } = await supabase
          .from('lesson_messages')
          .select(`
            *,
            profiles!sender_id(
              id,
              first_name,
              last_name,
              username,
              avatar_url,
              is_teacher
            ),
            replied_to_message:replied_to_message_id(
              id,
              content,
              sender_id,
              profiles!sender_id(
                id,
                first_name,
                last_name,
                username
              )
            )
          `)
          .eq('lesson_id', lessonId)
          .eq('formation_id', formationId)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id},is_system_message.eq.true`)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching individual messages:', error);
          return cachedMessages || [];
        }

        await localMessageStore.saveMessages(lessonId, formationId, user.id, messages || []);
        return messages || [];
      }

      // Messages de promotion : logique de filtrage par niveau
      const currentUserProgress = await getCurrentUserProgress(user.id, formationId);

      const { data: allMessages, error } = await supabase
        .from('lesson_messages')
        .select(`
          *,
          profiles!sender_id(
            id,
            first_name,
            last_name,
            username,
            avatar_url,
            is_teacher
          ),
          replied_to_message:replied_to_message_id(
            id,
            content,
            sender_id,
            profiles!sender_id(
              id,
              first_name,
              last_name,
              username
            )
          )
        `)
        .eq('lesson_id', lessonId)
        .eq('formation_id', formationId)
        .or(`promotion_id.eq.${userPromotion},is_system_message.eq.true,sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching promotion messages:', error);
        return cachedMessages || [];
      }

      if (!allMessages || allMessages.length === 0) {
        await localMessageStore.saveMessages(lessonId, formationId, user.id, []);
        return [];
      }

      const senderIds = [...new Set(allMessages.map(m => m.sender_id).filter(Boolean))] as string[];
      const userProgressMap = await getUsersProgressMap(senderIds);

      const filteredMessages = allMessages.filter(message => {
        if (message.is_system_message) return true;
        if (message.sender_id === user.id) return true;
        if (message.receiver_id === user.id) return true;
        
        if (message.replied_to_message_id) {
          const replyTarget = allMessages.find(m => m.id === message.replied_to_message_id);
          if (replyTarget?.sender_id === user.id) return true;
        }
        
        if (message.profiles?.is_teacher) return true;
        
        const senderProgress = userProgressMap.get(message.sender_id);
        if (senderProgress) {
          return senderProgress.levelOrder < currentUserProgress.levelOrder || 
                 (senderProgress.levelOrder === currentUserProgress.levelOrder && 
                  senderProgress.lessonOrder <= currentUserProgress.lessonOrder);
        }
        
        return false;
      });

      // Sauvegarder dans le cache
      await localMessageStore.saveMessages(lessonId, formationId, user.id, filteredMessages);
      
      console.log('✅ Messages synced:', {
        total: allMessages.length,
        filtered: filteredMessages.length,
      });

      return filteredMessages;
    },
    enabled: !!lessonId && !!formationId && !!user?.id,
    // Utiliser le cache comme données initiales
    initialData: cachedMessages || undefined,
    // Refetch en arrière-plan toutes les 5 secondes (seulement si en ligne)
    refetchInterval: isOnline ? 5000 : false,
    // Considérer les données comme fraîches pendant 3 secondes (ou indéfiniment si hors ligne)
    staleTime: isOnline ? 3000 : Infinity,
  });

  return {
    ...query,
    isLoadingFromCache: isLoadingCache,
    hasCachedData: cachedMessages !== null,
    isOffline: !isOnline,
  };
};
