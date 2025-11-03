/**
 * Hook pour tracker automatiquement le temps d'activité quotidien
 * Utilise le système de présence temps réel pour mettre à jour daily_usage
 * Valide automatiquement le streak lorsque le temps requis est atteint
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePresence } from '@/contexts/PresenceContext';
import { useStreakConfig } from './useStreakConfig';
import { useUserStreak } from './useUserStreak';

interface UseActivityTimeTrackerOptions {
  userId?: string;
  formationId?: string;
}

export const useActivityTimeTracker = ({ userId, formationId }: UseActivityTimeTrackerOptions) => {
  const { currentStatus } = usePresence();
  const { globalConfig } = useStreakConfig();
  const { streak, updateStreak } = useUserStreak(userId);
  const sessionStartRef = useRef<Date | null>(null);
  const lastUpdateRef = useRef<Date | null>(null);
  const accumulatedMinutesRef = useRef(0);
  const hasValidatedTodayRef = useRef(false);

  // Log pour debug
  useEffect(() => {
    console.log('🕐 ActivityTimeTracker initialisé:', { userId, formationId, currentStatus });
  }, [userId, formationId, currentStatus]);

  // Vérifier et valider le streak si le seuil est atteint
  const checkAndValidateStreak = async () => {
    if (!userId || !globalConfig || !streak) return;

    const today = new Date().toISOString().split('T')[0];
    
    // Si déjà validé aujourd'hui, ne rien faire
    if (hasValidatedTodayRef.current || streak.last_activity_date === today) {
      return;
    }

    // Vérifier les minutes du jour depuis user_streaks
    const { data: streakRow, error } = await supabase
      .from('user_streaks')
      .select('daily_minutes, last_activity_date')
      .eq('user_id', userId)
      .single();

    if (error) return;

    const totalMinutes = streakRow?.daily_minutes ?? 0;
    const requiredMinutes = globalConfig.minutes_per_day_required;

    // Valider le streak si le seuil est atteint
    if (totalMinutes >= requiredMinutes) {
      console.log('✅ Seuil de temps atteint! Validation du streak:', {
        totalMinutes,
        requiredMinutes,
        today
      });
      
      updateStreak({ increment: true });
      hasValidatedTodayRef.current = true;
    }
  };

  // Sauvegarder le temps accumulé dans daily_usage
  const saveTimeToDatabase = async (minutesToAdd: number) => {
    if (!userId || !formationId || minutesToAdd <= 0) return;

    const today = new Date().toISOString().split('T')[0];

    try {
      // Vérifier si un enregistrement existe déjà
      const { data: existing } = await supabase
        .from('daily_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('formation_id', formationId)
        .eq('date', today)
        .maybeSingle();

      if (existing) {
        // Mettre à jour l'enregistrement existant
        await supabase
          .from('daily_usage')
          .update({
            minutes_used: existing.minutes_used + minutesToAdd,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Créer un nouvel enregistrement
        await supabase
          .from('daily_usage')
          .insert({
            user_id: userId,
            formation_id: formationId,
            date: today,
            minutes_used: minutesToAdd,
            messages_sent: 0,
          });
      }

      console.log(`✅ Temps sauvegardé: ${minutesToAdd} minutes pour ${today}`, { userId, formationId });
      
      // Vérifier automatiquement si le streak doit être validé après la sauvegarde
      await checkAndValidateStreak();
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde du temps:', error);
    }
  };

  // Calculer et sauvegarder le temps écoulé
  const updateAccumulatedTime = async () => {
    if (!sessionStartRef.current || !lastUpdateRef.current) return;

    const now = new Date();
    const minutesElapsed = Math.floor(
      (now.getTime() - lastUpdateRef.current.getTime()) / (60 * 1000)
    );

    if (minutesElapsed >= 1) {
      accumulatedMinutesRef.current += minutesElapsed;
      lastUpdateRef.current = now;

      // Sauvegarder toutes les 5 minutes accumulées
      if (accumulatedMinutesRef.current >= 5) {
        await saveTimeToDatabase(accumulatedMinutesRef.current);
        accumulatedMinutesRef.current = 0;
      }
    }
  };

  // Démarrer une session de tracking
  const startTracking = () => {
    const now = new Date();
    sessionStartRef.current = now;
    lastUpdateRef.current = now;
    console.log('▶️ Tracking démarré:', { userId, formationId, time: now.toISOString() });
  };

  // Arrêter le tracking et sauvegarder le temps restant
  const stopTracking = async () => {
    if (sessionStartRef.current && lastUpdateRef.current) {
      await updateAccumulatedTime();
      
      // Sauvegarder les minutes restantes
      if (accumulatedMinutesRef.current > 0) {
        await saveTimeToDatabase(accumulatedMinutesRef.current);
        accumulatedMinutesRef.current = 0;
      }
    }
    
    sessionStartRef.current = null;
    lastUpdateRef.current = null;
  };

  // Gérer les changements de statut de présence
  useEffect(() => {
    if (!userId || !formationId) {
      console.log('⚠️ Tracking non activé:', { userId, formationId });
      return;
    }

    if (currentStatus === 'online') {
      // Utilisateur actif, démarrer le tracking
      if (!sessionStartRef.current) {
        startTracking();
      }
    } else {
      // Utilisateur idle ou offline, arrêter le tracking
      if (sessionStartRef.current) {
        console.log('⏸️ Tracking arrêté:', { currentStatus });
        stopTracking();
      }
    }
  }, [currentStatus, userId, formationId]);

  // Mettre à jour le temps toutes les minutes
  useEffect(() => {
    if (!userId || !formationId) return;

    const interval = setInterval(() => {
      if (currentStatus === 'online' && sessionStartRef.current) {
        updateAccumulatedTime();
      }
    }, 60 * 1000); // Toutes les minutes

    return () => clearInterval(interval);
  }, [currentStatus, userId, formationId]);

  // Réinitialiser le flag de validation à minuit
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    const timer = setTimeout(() => {
      hasValidatedTodayRef.current = false;
      console.log('🌙 Minuit - Flag de validation réinitialisé');
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, []);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (sessionStartRef.current) {
        stopTracking();
      }
    };
  }, []);

  return {
    isTracking: !!sessionStartRef.current,
    currentStatus,
  };
};
