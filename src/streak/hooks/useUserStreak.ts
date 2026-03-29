/**
 * Hook pour gérer le streak d'un utilisateur
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import * as React from 'react';

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
  streaks_required: number;
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

  // Récupérer tous les niveaux pour trouver le palier atteint
  const { data: allLevels } = useQuery({
    queryKey: ['streak-levels-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('streak_levels_config')
        .select('*')
        .order('streaks_required', { ascending: true });

      if (error) throw error;
      return data as StreakLevel[];
    },
  });

  // Récupérer le niveau actuel basé sur le streak (palier atteint)
  const currentLevelDetails = React.useMemo(() => {
    if (!allLevels || allLevels.length === 0) return null;
    if (!streak) return null;

    // Trier par streaks requis croissant
    const sorted = [...allLevels].sort((a, b) => a.streaks_required - b.streaks_required);

    // Si aucun palier atteint, retourner le premier niveau (Explorer)
    if (streak.current_streak < sorted[0].streaks_required) {
      return sorted[0]; // Premier niveau par défaut
    }

    // Trouver le palier le plus élevé atteint
    let achievedLevel: StreakLevel | null = null;
    for (const level of sorted) {
      if (streak.current_streak >= level.streaks_required) {
        achievedLevel = level;
      } else {
        break;
      }
    }

    return achievedLevel;
  }, [streak, allLevels]);

  // Récupérer tous les niveaux déjà obtenus (paliers débloqués)
  const earnedLevels = React.useMemo(() => {
    if (!allLevels || allLevels.length === 0) return [];
    if (!streak) return [];

    const sorted = [...allLevels].sort((a, b) => a.streaks_required - b.streaks_required);
    return sorted.filter(level => streak.current_streak >= level.streaks_required);
  }, [streak, allLevels]);

  // Récupérer le prochain niveau (prochain palier)
  const nextLevelDetails = React.useMemo(() => {
    if (!streak || !allLevels || allLevels.length === 0) return null;

    // Trier par streaks requis croissant
    const sorted = [...allLevels].sort((a, b) => a.streaks_required - b.streaks_required);

    // Trouver le prochain palier non atteint
    for (const level of sorted) {
      if (streak.current_streak < level.streaks_required) {
        return level;
      }
    }

    return null; // Tous les paliers sont atteints
  }, [streak, allLevels]);

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
          } else {
            // Nouveau départ si on n'a pas eu d'activité hier
            newStreak = 1;
          }
        }
      } else {
        // Décrémenter manuellement
        newStreak = Math.max(0, newStreak - 1);
      }

      // 🔥 Calculer automatiquement le niveau basé sur le streak
      const { data: levelsData } = await supabase
        .from('streak_levels_config')
        .select('*')
        .order('level_number', { ascending: false });

      let calculatedLevel = 0;
      if (levelsData) {
        // Trouver le niveau le plus élevé atteint basé sur les streaks
        for (const level of levelsData) {
          if (newStreak >= level.streaks_required) {
            calculatedLevel = level.level_number;
            break;
          }
        }
      }

      const { data, error } = await supabase
        .from('user_streaks')
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(streak.longest_streak, newStreak),
          total_days_active: increment ? streak.total_days_active + 1 : streak.total_days_active,
          last_activity_date: today,
          current_level: calculatedLevel, // 🔥 Mise à jour automatique du niveau
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      
      console.log('🎯 Streak mis à jour:', { 
        newStreak, 
        calculatedLevel, 
        previousLevel: streak.current_level 
      });
      
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
    earnedLevels,
    isLoading,
    error,
    updateStreak: updateStreakMutation.mutate,
    isUpdating: updateStreakMutation.isPending,
  };
};
