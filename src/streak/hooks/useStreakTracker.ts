/**
 * Hook pour lire la progression quotidienne du streak depuis la table user_streaks
 * Lit directement depuis user_streaks.daily_minutes (alimenté par useStreakSessionTracker + useActivityTracker)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStreakConfig } from './useStreakConfig';

export const useStreakProgress = (userId?: string) => {
  const { globalConfig } = useStreakConfig();

  // Récupérer les minutes quotidiennes depuis user_streaks
  const { data: dailyProgress } = useQuery({
    queryKey: ['streak-daily-progress', userId],
    queryFn: async () => {
      if (!userId) return null;

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('user_streaks')
        .select('daily_minutes, last_activity_date')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      return {
        dailyMinutes: data.daily_minutes || 0,
        lastActivityDate: data.last_activity_date,
        isValidatedToday: data.last_activity_date === today,
      };
    },
    enabled: !!userId,
    staleTime: 60000, // Cache pendant 1 minute
    refetchInterval: 60000, // Toutes les minutes au lieu de 10 secondes
  });

  const requiredMinutes = globalConfig?.minutes_per_day_required || 5;
  const todayUsage = dailyProgress?.dailyMinutes || 0;
  const isStreakValidated = dailyProgress?.isValidatedToday || false;

  return {
    todayUsage,
    requiredMinutes,
    isStreakValidated,
  };
};
