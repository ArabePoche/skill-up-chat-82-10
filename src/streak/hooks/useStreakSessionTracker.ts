/**
 * Hook pour tracker automatiquement les sessions utilisateur et mettre à jour les streaks
 * - Enregistre last_login_at à la connexion
 * - Enregistre last_logout_at à la déconnexion
 * - Calcule automatiquement daily_minutes
 * - Incrémente/décrémente current_streak selon l'activité
 * - Met à jour current_level automatiquement
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePresence } from '@/contexts/PresenceContext';
import { useAuth } from '@/hooks/useAuth';
import { useStreakConfig } from './useStreakConfig';

export const useStreakSessionTracker = () => {
  const { user } = useAuth();
  const { currentStatus } = usePresence();
  const { globalConfig, levels } = useStreakConfig();
  
  const previousStatusRef = useRef<string | null>(null);
  const sessionStartRef = useRef<Date | null>(null);

  // Initialiser ou récupérer l'enregistrement streak de l'utilisateur
  const initializeStreak = async (userId: string) => {
    const { data: existing } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      // Créer un nouvel enregistrement
      await supabase.from('user_streaks').insert({
        user_id: userId,
        current_streak: 0,
        longest_streak: 0,
        total_days_active: 0,
        current_level: 0,
        daily_minutes: 0,
      });
      console.log('🆕 Nouvel enregistrement streak créé pour:', userId);
    }

    return existing;
  };

  // Calculer le niveau basé sur le nombre de streaks
  const calculateLevel = (streakCount: number): number => {
    if (!levels || levels.length === 0) return 0;

    // Trier les niveaux par ordre décroissant
    const sortedLevels = [...levels].sort((a, b) => b.days_required - a.days_required);

    // Trouver le niveau le plus élevé atteint
    for (const level of sortedLevels) {
      if (streakCount >= level.days_required) {
        return level.level_number;
      }
    }

    return 0;
  };

  // Calculer les jours manqués entre deux dates
  const calculateMissedDays = (lastActivityDate: string | null): number => {
    if (!lastActivityDate) return 0;

    const today = new Date().toISOString().split('T')[0];
    const lastDate = new Date(lastActivityDate);
    const todayDate = new Date(today);
    
    const diffTime = todayDate.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Si plus d'un jour s'est écoulé, retourner le nombre de jours manqués
    return Math.max(0, diffDays - 1);
  };

  // Vérifier et valider le streak quotidien
  const validateDailyStreak = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0];

    const { data: streak } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!streak || !globalConfig) return;

    // Si déjà validé aujourd'hui, ne rien faire
    if (streak.last_activity_date === today) {
      return;
    }

    // Calculer les jours manqués
    const missedDays = calculateMissedDays(streak.last_activity_date);

    // Calculer le nouveau streak
    let newStreak = streak.current_streak;

    if (missedDays > 0) {
      // Décrémenter le streak selon le nombre de jours manqués
      newStreak = Math.max(0, newStreak - missedDays);
      console.log(`❌ ${missedDays} jour(s) manqué(s). Streak: ${streak.current_streak} → ${newStreak}`);
    }

    // Vérifier si l'utilisateur a atteint le seuil de minutes requis
    if (streak.daily_minutes >= globalConfig.minutes_per_day_required) {
      newStreak += 1;
      console.log(`✅ Streak validé! Minutes: ${streak.daily_minutes}/${globalConfig.minutes_per_day_required}`);
    }

    // Calculer le nouveau niveau
    const newLevel = calculateLevel(newStreak);

    // Mettre à jour la base de données
    await supabase
      .from('user_streaks')
      .update({
        current_streak: newStreak,
        longest_streak: Math.max(streak.longest_streak, newStreak),
        total_days_active: streak.total_days_active + (streak.daily_minutes >= globalConfig.minutes_per_day_required ? 1 : 0),
        current_level: newLevel,
        last_activity_date: today,
        daily_minutes: 0, // Réinitialiser pour le nouveau jour
      })
      .eq('user_id', userId);

    console.log('🎯 Streak mis à jour:', {
      newStreak,
      newLevel,
      previousLevel: streak.current_level,
      missedDays,
    });
  };

  // Gérer la connexion de l'utilisateur
  const handleLogin = async (userId: string) => {
    const now = new Date().toISOString();
    
    await initializeStreak(userId);

    // Mettre à jour last_login_at
    await supabase
      .from('user_streaks')
      .update({
        last_login_at: now,
      })
      .eq('user_id', userId);

    sessionStartRef.current = new Date(now);
    
    // Vérifier et valider le streak quotidien
    await validateDailyStreak(userId);

    console.log('🟢 Connexion enregistrée:', { userId, time: now });
  };

  // Gérer la déconnexion de l'utilisateur
  const handleLogout = async (userId: string) => {
    if (!sessionStartRef.current) return;

    const now = new Date();
    const sessionDuration = Math.floor(
      (now.getTime() - sessionStartRef.current.getTime()) / (60 * 1000)
    ); // Minutes

    // Récupérer le streak actuel
    const { data: streak } = await supabase
      .from('user_streaks')
      .select('daily_minutes')
      .eq('user_id', userId)
      .single();

    if (streak) {
      const newDailyMinutes = streak.daily_minutes + sessionDuration;

      // Mettre à jour last_logout_at et daily_minutes
      await supabase
        .from('user_streaks')
        .update({
          last_logout_at: now.toISOString(),
          daily_minutes: newDailyMinutes,
        })
        .eq('user_id', userId);

      console.log('🔴 Déconnexion enregistrée:', {
        userId,
        sessionDuration: `${sessionDuration} min`,
        totalToday: `${newDailyMinutes} min`,
      });
    }

    sessionStartRef.current = null;
  };

  // Écouter les changements de statut de présence
  useEffect(() => {
    if (!user) return;

    const handleStatusChange = async () => {
      const previousStatus = previousStatusRef.current;
      
      // Connexion: passage de offline à online
      if (previousStatus !== 'online' && currentStatus === 'online') {
        await handleLogin(user.id);
      }
      
      // Déconnexion: passage de online à offline ou idle
      if (previousStatus === 'online' && (currentStatus === 'offline' || currentStatus === 'idle')) {
        await handleLogout(user.id);
      }

      previousStatusRef.current = currentStatus;
    };

    handleStatusChange();
  }, [currentStatus, user]);

  // Vérifier le streak à minuit
  useEffect(() => {
    if (!user) return;

    const checkMidnight = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const msUntilMidnight = midnight.getTime() - now.getTime();

      const timer = setTimeout(() => {
        console.log('🌙 Minuit! Vérification du streak...');
        validateDailyStreak(user.id);
      }, msUntilMidnight);

      return timer;
    };

    const timer = checkMidnight();
    return () => clearTimeout(timer);
  }, [user, globalConfig]);

  // Cleanup à la fermeture de l'application
  useEffect(() => {
    if (!user) return;

    const handleBeforeUnload = () => {
      if (sessionStartRef.current) {
        handleLogout(user.id);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (sessionStartRef.current && user) {
        handleLogout(user.id);
      }
    };
  }, [user]);

  return {
    isTracking: !!sessionStartRef.current,
    currentStatus,
  };
};
