/**
 * Hook pour le chat de groupe en mode offline
 * Fournit les données depuis le cache quand la connexion n'est pas disponible
 */

import { useState, useEffect } from 'react';
import { useOfflineSync } from './useOfflineSync';
import { offlineStore } from '../utils/offlineStore';
import { localMessageStore } from '@/message-cache/utils/localMessageStore';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OfflineGroupChatData {
  messages: any[];
  promotionId: string | null;
  chatMode: 'private' | 'group';
  isLoading: boolean;
  isOfflineMode: boolean;
  lessons: any[];
  exercises: any[];
}

/**
 * Récupère les données du chat de groupe depuis le cache offline
 * ou depuis Supabase si en ligne
 */
export const useOfflineGroupChat = (
  levelId: string | undefined,
  formationId: string | undefined
): OfflineGroupChatData => {
  const { user } = useAuth();
  const { isOnline } = useOfflineSync();
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [promotionId, setPromotionId] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<'private' | 'group'>('group');
  const [lessons, setLessons] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);

  useEffect(() => {
    if (!levelId || !formationId || !user?.id) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);

      try {
        if (isOnline) {
          // En ligne : charger les données depuis Supabase
          await loadOnlineData();
        } else {
          // Hors ligne : charger depuis le cache
          await loadOfflineData();
        }
      } catch (error) {
        console.error('❌ Error loading group chat data:', error);
        // En cas d'erreur, essayer le cache
        await loadOfflineData();
      } finally {
        setIsLoading(false);
      }
    };

    const loadOnlineData = async () => {
      // Récupérer la promotion de l'utilisateur via student_promotions
      const { data: promotionData } = await supabase
        .from('student_promotions')
        .select(`
          promotion_id,
          promotions (
            id,
            name,
            formation_id
          )
        `)
        .eq('student_id', user!.id)
        .eq('is_active', true)
        .single();

      if (promotionData?.promotion_id) {
        setPromotionId(promotionData.promotion_id);
        // Sauvegarder dans le cache pour usage offline
        await offlineStore.cacheQuery(
          `promotion_${user!.id}_${formationId}`,
          { promotion_id: promotionData.promotion_id },
          1000 * 60 * 60 * 24 * 7 // 7 jours
        );
      }

      // Récupérer le mode de chat
      const { data: enrollmentData } = await supabase
        .from('enrollment_requests')
        .select('plan_type')
        .eq('user_id', user!.id)
        .eq('formation_id', formationId)
        .eq('status', 'approved')
        .single();

      const mode = (enrollmentData?.plan_type === 'groupe' || enrollmentData?.plan_type === 'premium') 
        ? 'group' 
        : 'private';
      setChatMode(mode);

      // Sauvegarder pour offline
      await offlineStore.cacheQuery(
        `chat_mode_${user!.id}_${formationId}`,
        { mode, planType: enrollmentData?.plan_type },
        1000 * 60 * 60 * 24 * 7
      );

      // Récupérer les leçons du niveau
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('level_id', levelId)
        .order('order_index', { ascending: true });

      if (lessonsData) {
        setLessons(lessonsData);
        // Sauvegarder chaque leçon
        for (const lesson of lessonsData) {
          await offlineStore.saveLesson({ ...lesson, level_id: levelId });
        }
      }

      // Récupérer les exercices du niveau
      const { data: exercisesData } = await supabase
        .from('exercises')
        .select('*')
        .in('lesson_id', lessonsData?.map(l => l.id) || []);

      if (exercisesData) {
        setExercises(exercisesData);
        await offlineStore.cacheQuery(
          `exercises_level_${levelId}`,
          exercisesData,
          1000 * 60 * 60 * 24 * 7
        );
      }

      // Récupérer les messages (via le cache local des messages)
      const cacheKey = `level_${levelId}`;
      const cachedMessages = await localMessageStore.getMessages(
        cacheKey,
        formationId,
        `${user!.id}_${promotionData?.promotion_id || 'default'}`,
        false // Ne pas ignorer l'expiration en ligne
      );
      
      if (cachedMessages) {
        setMessages(cachedMessages);
      }
    };

    const loadOfflineData = async () => {
      console.log('📴 Loading group chat data from offline cache...');

      // Récupérer la promotion depuis le cache
      const cachedPromotion = await offlineStore.getCachedQuery(
        `promotion_${user!.id}_${formationId}`
      );
      if (cachedPromotion?.promotion_id) {
        setPromotionId(cachedPromotion.promotion_id);
      } else {
        // Créer un ID de promotion factice pour permettre l'affichage offline
        setPromotionId('offline_promotion');
      }

      // Récupérer le mode de chat depuis le cache
      const cachedChatMode = await offlineStore.getCachedQuery(
        `chat_mode_${user!.id}_${formationId}`
      );
      if (cachedChatMode) {
        setChatMode(cachedChatMode.mode || 'group');
      }

      // Récupérer les leçons depuis le cache
      const cachedLessons = await offlineStore.getLessonsByFormation(formationId);
      const levelLessons = cachedLessons.filter((l: any) => l.level_id === levelId);
      setLessons(levelLessons);

      // Récupérer les exercices depuis le cache
      const cachedExercises = await offlineStore.getCachedQuery(
        `exercises_level_${levelId}`
      );
      if (cachedExercises) {
        setExercises(cachedExercises);
      }

      // Récupérer les messages depuis le cache local (ignorer l'expiration en mode offline)
      const cacheKey = `level_${levelId}`;
      const cachedMessages = await localMessageStore.getMessages(
        cacheKey,
        formationId,
        `${user!.id}_${cachedPromotion?.promotion_id || 'offline_promotion'}`,
        true // Ignorer l'expiration en mode offline
      );
      
      if (cachedMessages) {
        setMessages(cachedMessages);
      }
    };

    loadData();
  }, [levelId, formationId, user?.id, isOnline]);

  return {
    messages,
    promotionId,
    chatMode,
    isLoading,
    isOfflineMode: !isOnline,
    lessons,
    exercises,
  };
};
