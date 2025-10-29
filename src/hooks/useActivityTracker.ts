/**
 * Hook pour tracker l'activité utilisateur (scroll, navigation, interactions)
 * Met à jour automatiquement la présence utilisateur pour maintenir le statut "online"
 * Vérifie et crée automatiquement l'enregistrement streak si nécessaire
 * Valide automatiquement le streak lorsque le temps requis est atteint
 */
import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePresence } from '@/contexts/PresenceContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ensureStreakRecord, updateLastActivity } from '@/streak/utils/streakInitializer';
import { useStreakConfig } from '@/streak/hooks/useStreakConfig';
import { useUserStreak } from '@/streak/hooks/useUserStreak';

const ACTIVITY_THROTTLE = 5000; // Ne pas rafraîchir plus d'une fois toutes les 5 secondes
const STREAK_CHECK_THROTTLE = 30000; // Vérifier le streak toutes les 30 secondes max

export const useActivityTracker = () => {
  const { user } = useAuth();
  const { trackPresence, currentStatus } = usePresence();
  const { globalConfig } = useStreakConfig();
  const { streak, updateStreak } = useUserStreak(user?.id);
  const location = useLocation();
  const lastActivityRef = useRef<number>(0);
  const lastStreakCheckRef = useRef<number>(0);
  const isTrackingRef = useRef(false);
  const streakInitializedRef = useRef(false);
  const hasValidatedTodayRef = useRef(false);

  // Initialiser l'enregistrement streak au montage
  useEffect(() => {
    const initStreak = async () => {
      if (!user || streakInitializedRef.current) return;
      
      console.log('🔍 Vérification/Initialisation du streak pour:', user.id);
      const success = await ensureStreakRecord(user.id);
      
      if (success) {
        streakInitializedRef.current = true;
        console.log('✅ Streak initialisé avec succès');
      }
    };

    initStreak();
  }, [user]);

  // Vérifier et valider le streak si le seuil est atteint
  const checkAndValidateStreak = useCallback(async () => {
    if (!user || !globalConfig || !streak) return;

    const today = new Date().toISOString().split('T')[0];
    
    // Si déjà validé aujourd'hui, ne rien faire
    if (hasValidatedTodayRef.current || streak.last_activity_date === today) {
      return;
    }

    // Vérifier les minutes du jour depuis user_streaks
    const { data: streakRow, error } = await supabase
      .from('user_streaks')
      .select('daily_minutes, last_activity_date')
      .eq('user_id', user.id)
      .single();

    if (error) return;

    const totalMinutes = streakRow?.daily_minutes ?? 0;
    const requiredMinutes = globalConfig.minutes_per_day_required;

    // Valider le streak si le seuil est atteint
    if (totalMinutes >= requiredMinutes) {
      console.log('✅ Seuil de temps atteint via interactions! Validation du streak:', {
        totalMinutes,
        requiredMinutes,
        today
      });
      
      updateStreak({ increment: true });
      hasValidatedTodayRef.current = true;
    }
  }, [user, globalConfig, streak, updateStreak]);

  // Fonction pour enregistrer une activité
  const recordActivity = useCallback(async (activityType: string) => {
    if (!user || !isTrackingRef.current) return;

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    const timeSinceLastStreakCheck = now - lastStreakCheckRef.current;

    // Throttle: éviter de tracker trop souvent
    if (timeSinceLastActivity < ACTIVITY_THROTTLE) {
      return;
    }

    lastActivityRef.current = now;

    // Vérifier/créer l'enregistrement streak périodiquement
    if (timeSinceLastStreakCheck > STREAK_CHECK_THROTTLE) {
      lastStreakCheckRef.current = now;
      
      if (!streakInitializedRef.current) {
        const success = await ensureStreakRecord(user.id);
        if (success) {
          streakInitializedRef.current = true;
        }
      }
      
      // Mettre à jour la date de dernière activité
      await updateLastActivity(user.id);
      
      // Vérifier si le streak doit être validé
      await checkAndValidateStreak();
    }

    // Remettre en online si on était idle
    if (currentStatus !== 'online') {
      console.log(`🎯 Activité détectée (${activityType}) - Passage en online`);
      await trackPresence('online');
    }
  }, [user, currentStatus, trackPresence, checkAndValidateStreak]);

  // Tracker le scroll
  useEffect(() => {
    if (!user) return;

    isTrackingRef.current = true;

    const handleScroll = () => {
      recordActivity('scroll');
    };

    // Ajouter l'écouteur de scroll avec options passives pour de meilleures performances
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
    };
  }, [user, recordActivity]);

  // Tracker les changements de route/page
  useEffect(() => {
    if (!user) return;

    console.log(`🧭 Navigation vers: ${location.pathname}`);
    recordActivity('navigation');
  }, [location.pathname, user, recordActivity]);

  // Tracker les interactions vidéo
  useEffect(() => {
    if (!user) return;

    const handleVideoInteraction = (event: Event) => {
      const target = event.target as HTMLVideoElement;
      if (target.tagName === 'VIDEO') {
        recordActivity(`video_${event.type}`);
      }
    };

    // Écouter les événements vidéo
    document.addEventListener('play', handleVideoInteraction, { capture: true });
    document.addEventListener('pause', handleVideoInteraction, { capture: true });
    document.addEventListener('seeked', handleVideoInteraction, { capture: true });
    document.addEventListener('volumechange', handleVideoInteraction, { capture: true });

    return () => {
      document.removeEventListener('play', handleVideoInteraction, { capture: true });
      document.removeEventListener('pause', handleVideoInteraction, { capture: true });
      document.removeEventListener('seeked', handleVideoInteraction, { capture: true });
      document.removeEventListener('volumechange', handleVideoInteraction, { capture: true });
    };
  }, [user, recordActivity]);

  // Tracker les clics sur les posts/vidéos
  useEffect(() => {
    if (!user) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Détecter les clics sur les posts/vidéos
      if (
        target.closest('[data-type="post"]') ||
        target.closest('[data-type="video"]') ||
        target.closest('video') ||
        target.closest('.post-container') ||
        target.closest('.video-container')
      ) {
        recordActivity('content_interaction');
      }
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [user, recordActivity]);

  // Réinitialiser le flag de validation à minuit
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    const timer = setTimeout(() => {
      hasValidatedTodayRef.current = false;
      console.log('🌙 Minuit - Flag de validation réinitialisé (ActivityTracker)');
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      isTrackingRef.current = false;
      streakInitializedRef.current = false;
    };
  }, []);

  return {
    recordActivity,
  };
};
