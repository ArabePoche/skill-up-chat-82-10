/**
 * Hook pour suivre l'activité quotidienne et valider les streaks
 */
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserStreak } from './useUserStreak';
import { useStreakConfig } from './useStreakConfig';

export const useStreakTracker = (userId?: string) => {
  const { streak, updateStreak } = useUserStreak(userId);
  const { globalConfig } = useStreakConfig();
  const hasCheckedToday = useRef(false);

  // Récupérer l'utilisation quotidienne
  const { data: todayUsage } = useQuery({
    queryKey: ['daily-usage-today', userId],
    queryFn: async () => {
      if (!userId) return null;

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today);

      if (error) throw error;

      // Calculer le total de minutes utilisées aujourd'hui
      const totalMinutes = data.reduce((sum, usage) => sum + usage.minutes_used, 0);
      
      return {
        totalMinutes,
        records: data,
      };
    },
    enabled: !!userId,
    refetchInterval: 60000, // Refetch toutes les minutes
  });

  // Vérifier si l'utilisateur a atteint le minimum de minutes
  useEffect(() => {
    if (!userId || !streak || !globalConfig || !todayUsage || hasCheckedToday.current) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const lastActivity = streak.last_activity_date;

    // Si déjà compté aujourd'hui, ne rien faire
    if (lastActivity === today) {
      hasCheckedToday.current = true;
      return;
    }

    // Vérifier si l'utilisateur a atteint le minimum de minutes
    const requiredMinutes = globalConfig.minutes_per_day_required;
    if (todayUsage.totalMinutes >= requiredMinutes) {
      console.log('✅ Streak validé pour aujourd\'hui!', {
        minutes: todayUsage.totalMinutes,
        required: requiredMinutes,
      });
      
      updateStreak({ increment: true });
      hasCheckedToday.current = true;
    }
  }, [userId, streak, globalConfig, todayUsage, updateStreak]);

  // Réinitialiser le flag à minuit
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    const timer = setTimeout(() => {
      hasCheckedToday.current = false;
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, []);

  return {
    todayUsage: todayUsage?.totalMinutes || 0,
    requiredMinutes: globalConfig?.minutes_per_day_required || 10,
    isStreakValidated: streak?.last_activity_date === new Date().toISOString().split('T')[0],
  };
};
