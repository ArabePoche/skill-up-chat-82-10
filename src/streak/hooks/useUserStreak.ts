/**
 * Hook pour gérer le streak d'un utilisateur
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface UserStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  total_days_active: number;
  current_level: number;
  last_activity_date: string | null;
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
}

export const useUserStreak = (userId?: string) => {
  const queryClient = useQueryClient();

  // Récupérer le streak de l'utilisateur
  const { data: streak, isLoading, error } = useQuery({
    queryKey: ['user-streak', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Si l'utilisateur n'a pas encore de streak, créer un
        if (error.code === 'PGRST116') {
          const { data: newStreak, error: createError } = await supabase
            .from('user_streaks')
            .insert({
              user_id: userId,
              current_streak: 0,
              longest_streak: 0,
              total_days_active: 0,
              current_level: 0
            })
            .select()
            .single();

          if (createError) throw createError;
          return newStreak as UserStreak;
        }
        throw error;
      }

      return data as UserStreak;
    },
    enabled: !!userId,
  });

  // Récupérer le niveau actuel avec ses détails
  const { data: currentLevelDetails } = useQuery({
    queryKey: ['streak-level', streak?.current_level],
    queryFn: async () => {
      if (!streak || streak.current_level === 0) return null;

      const { data, error } = await supabase
        .from('streak_levels_config')
        .select('*')
        .eq('level_number', streak.current_level)
        .single();

      if (error) throw error;
      return data as StreakLevel;
    },
    enabled: !!streak && streak.current_level > 0,
  });

  // Récupérer le prochain niveau
  const { data: nextLevelDetails } = useQuery({
    queryKey: ['streak-next-level', streak?.current_level],
    queryFn: async () => {
      if (!streak) return null;

      const { data, error } = await supabase
        .from('streak_levels_config')
        .select('*')
        .eq('level_number', (streak.current_level || 0) + 1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as StreakLevel | null;
    },
    enabled: !!streak,
  });

  // Mutation pour mettre à jour le streak
  const updateStreakMutation = useMutation({
    mutationFn: async ({ increment = true }: { increment?: boolean }) => {
      if (!userId || !streak) throw new Error('User ID or streak not found');

      const today = new Date().toISOString().split('T')[0];
      const lastActivity = streak.last_activity_date;

      // Calculer le nouveau streak
      let newStreak = streak.current_streak;
      
      if (increment) {
        // Vérifier si c'est un nouveau jour
        if (lastActivity !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          // Si l'activité était hier, incrémenter
          if (lastActivity === yesterdayStr) {
            newStreak += 1;
          } else if (lastActivity !== today) {
            // Si c'était il y a plus d'un jour, décrémenter
            newStreak = Math.max(0, newStreak - 1);
          }
        }
      } else {
        // Décrémenter manuellement
        newStreak = Math.max(0, newStreak - 1);
      }

      const { data, error } = await supabase
        .from('user_streaks')
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(streak.longest_streak, newStreak),
          total_days_active: increment ? streak.total_days_active + 1 : streak.total_days_active,
          last_activity_date: today,
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as UserStreak;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-streak', userId] });
      queryClient.invalidateQueries({ queryKey: ['streak-level'] });
      queryClient.invalidateQueries({ queryKey: ['streak-next-level'] });
    },
  });

  // Vérifier automatiquement le streak quotidien
  useEffect(() => {
    if (!streak || !userId) return;

    const checkAndUpdateStreak = async () => {
      const today = new Date().toISOString().split('T')[0];
      const lastActivity = streak.last_activity_date;

      // Si la dernière activité n'était pas aujourd'hui
      if (lastActivity !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Si la dernière activité n'était pas hier, décrémenter le streak
        if (lastActivity && lastActivity !== yesterdayStr) {
          await updateStreakMutation.mutateAsync({ increment: false });
        }
      }
    };

    checkAndUpdateStreak();
  }, [streak?.last_activity_date, userId]);

  return {
    streak,
    currentLevelDetails,
    nextLevelDetails,
    isLoading,
    error,
    updateStreak: updateStreakMutation.mutate,
    isUpdating: updateStreakMutation.isPending,
  };
};
