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
    refetchInterval: 10000, // Refetch toutes les 10 secondes pour UI temps réel
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
