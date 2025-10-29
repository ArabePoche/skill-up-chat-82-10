/**
 * Hook pour récupérer la configuration globale du système de streak
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StreakGlobalConfig {
  id: string;
  minutes_per_day_required: number;
  created_at: string;
  updated_at: string;
}

export interface StreakLevel {
  id: string;
  level_number: number;
  level_name: string;
  level_badge: string;
  days_required: number;
  level_color: string;
  created_at: string;
  updated_at: string;
}

export const useStreakConfig = () => {
  // Configuration globale
  const { data: globalConfig, isLoading: isLoadingGlobal } = useQuery({
    queryKey: ['streak-global-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('streak_global_config')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as StreakGlobalConfig;
    },
  });

  // Tous les niveaux
  const { data: levels, isLoading: isLoadingLevels } = useQuery({
    queryKey: ['streak-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('streak_levels_config')
        .select('*')
        .order('level_number', { ascending: true });

      if (error) throw error;
      return data as StreakLevel[];
    },
  });

  return {
    globalConfig,
    levels,
    isLoading: isLoadingGlobal || isLoadingLevels,
  };
};
