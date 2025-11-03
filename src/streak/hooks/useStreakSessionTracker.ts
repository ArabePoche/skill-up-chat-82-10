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
import { ensureStreakRecord } from '../utils/streakInitializer';

export const useStreakSessionTracker = () => {
  const { user } = useAuth();
  const { currentStatus } = usePresence();
  const { globalConfig, levels } = useStreakConfig();
  
  const previousStatusRef = useRef<string | null>(null);
  const previousUserRef = useRef<string | null>(null);
  const sessionStartRef = useRef<Date | null>(null);
  const lastUpdateRef = useRef<Date | null>(null);
  const accumulatedMinutesRef = useRef(0);

  // Initialiser ou récupérer l'enregistrement streak de l'utilisateur
  const initializeStreak = async (userId: string) => {
    // Utiliser la fonction utilitaire commune
    const success = await ensureStreakRecord(userId);
    
    if (success) {
      // Récupérer l'enregistrement après l'avoir créé/vérifié
      const { data: existing } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      return existing;
    }
    
    return null;
  };

  // Calculer le niveau basé sur le nombre de streaks (logique par intervalles)
  const calculateLevel = (streakCount: number): number => {
    if (!levels || levels.length === 0) return 1; // Niveau 1 par défaut si pas de configuration

    // Trier les niveaux par ordre croissant de streaks requis
    const sortedLevels = [...levels].sort((a, b) => a.streaks_required - b.streaks_required);

    // Trouver dans quel intervalle se situe le streak
    for (let i = 0; i < sortedLevels.length; i++) {
      const currentLevel = sortedLevels[i];
      const nextLevel = sortedLevels[i + 1];

      // Si on n'a pas encore atteint le premier palier, on est au niveau 1
      if (i === 0 && streakCount < currentLevel.streaks_required) {
        return 1;
      }

      // Si on a atteint ce palier mais pas le suivant (ou s'il n'y a pas de suivant)
      if (streakCount >= currentLevel.streaks_required && (!nextLevel || streakCount < nextLevel.streaks_required)) {
        return currentLevel.level_number + 1; // +1 car on passe au niveau suivant après avoir atteint le palier
      }
    }

    // Si on a dépassé tous les paliers, on est au niveau max + 1
    return sortedLevels[sortedLevels.length - 1].level_number + 1;
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

  // Flush des minutes accumulées vers user_streaks (toutes les ~1 min ou à la déconnexion)
  const flushAccumulatedMinutes = async (userId: string) => {
    if (!lastUpdateRef.current) return;
    const now = new Date();
    const minutesElapsed = Math.floor((now.getTime() - lastUpdateRef.current.getTime()) / (60 * 1000));
    if (minutesElapsed > 0) {
      accumulatedMinutesRef.current += minutesElapsed;
      lastUpdateRef.current = now;
    }
    if (accumulatedMinutesRef.current <= 0) return;
    const { data: streak } = await supabase
      .from('user_streaks')
      .select('daily_minutes')
      .eq('user_id', userId)
      .single();
    if (streak) {
      const newDaily = (streak.daily_minutes || 0) + accumulatedMinutesRef.current;
      await supabase
        .from('user_streaks')
        .update({ daily_minutes: newDaily })
        .eq('user_id', userId);
      console.log('💾 Minutes ajoutées:', accumulatedMinutesRef.current, '→ total', newDaily);
      accumulatedMinutesRef.current = 0;
    }
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
    lastUpdateRef.current = new Date(now);
    accumulatedMinutesRef.current = 0;
    
    // Vérifier et valider le streak quotidien
    await validateDailyStreak(userId);

    console.log('🟢 Connexion enregistrée:', { userId, time: now });
  };

  // Gérer la déconnexion de l'utilisateur
  const handleLogout = async (userId: string) => {
    if (!sessionStartRef.current) return;

    // Flush des minutes accumulées avant de clôturer la session
    await flushAccumulatedMinutes(userId);

    const now = new Date();

    // Mettre à jour uniquement last_logout_at (daily_minutes déjà mis à jour)
    await supabase
      .from('user_streaks')
      .update({
        last_logout_at: now.toISOString(),
      })
      .eq('user_id', userId);

    console.log('🔴 Déconnexion enregistrée:', {
      userId,
      time: now.toISOString(),
    });

    sessionStartRef.current = null;
    lastUpdateRef.current = null;
  };

  // Initialiser le streak dès le montage si l'utilisateur est connecté
  useEffect(() => {
    const initializeUserStreak = async () => {
      if (!user) return;
      
      console.log('🔍 Vérification/Initialisation du streak au montage:', user.id);
      await initializeStreak(user.id);
    };

    initializeUserStreak();
  }, [user]);

  // Tracker basé sur la présence utilisateur
  useEffect(() => {
    if (!user) {
      // Si plus d'utilisateur et qu'on avait un utilisateur avant, déconnexion
      if (previousUserRef.current) {
        console.log('🔓 Déconnexion complète détectée');
        handleLogout(previousUserRef.current);
        previousUserRef.current = null;
        previousStatusRef.current = null;
      }
      return;
    }

    const handlePresenceChange = async () => {
      const previousUser = previousUserRef.current;
      const previousStatus = previousStatusRef.current;
      
      // Premier montage avec utilisateur connecté
      if (!previousUser) {
        console.log('🔐 Connexion initiale détectée:', user.id);
        await handleLogin(user.id);
        previousUserRef.current = user.id;
        previousStatusRef.current = currentStatus;
        return;
      }
      
      // Changement d'utilisateur (déconnexion puis reconnexion)
      if (previousUser !== user.id) {
        console.log('👤 Changement d\'utilisateur détecté');
        await handleLogout(previousUser);
        await handleLogin(user.id);
        previousUserRef.current = user.id;
        previousStatusRef.current = currentStatus;
        return;
      }

      // Changements de statut de présence
      if (previousStatus !== currentStatus) {
        console.log(`📡 Changement de statut: ${previousStatus} → ${currentStatus}`);
        
        // Passage à online = connexion/reconnexion
        if (currentStatus === 'online' && previousStatus !== 'online') {
          await handleLogin(user.id);
        }
        
        // Passage à offline ou idle depuis online = déconnexion
        if (previousStatus === 'online' && (currentStatus === 'offline' || currentStatus === 'idle')) {
          await handleLogout(user.id);
        }
        
        previousStatusRef.current = currentStatus;
      }
    };

    handlePresenceChange();
  }, [user, currentStatus]);

  // Flush automatique des minutes chaque minute lorsque l'utilisateur est en ligne
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (currentStatus === 'online' && lastUpdateRef.current) {
        flushAccumulatedMinutes(user.id);
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [user, currentStatus]);
  
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
