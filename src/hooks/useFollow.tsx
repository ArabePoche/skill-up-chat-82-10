import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

/**
 * Hook pour gérer le système de suivi (follow/unfollow)
 */
export const useFollow = (targetUserId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Vérifier si l'utilisateur suit déjà cette personne
  const { data: isFollowing = false } = useQuery({
    queryKey: ['is-following', user?.id, targetUserId],
    queryFn: async () => {
      if (!user?.id || !targetUserId) return false;

      const { data, error } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle();

      if (error) {
        console.error('Erreur vérification follow:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user?.id && !!targetUserId && user.id !== targetUserId,
  });

  // Toggle follow/unfollow
  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!user?.id || !targetUserId) {
        throw new Error('Utilisateur non connecté ou cible invalide');
      }

      if (user.id === targetUserId) {
        throw new Error('Vous ne pouvez pas vous suivre vous-même');
      }

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (error) throw error;
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-following', user?.id, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['followers-count', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['following-count', user?.id] });
      
      toast.success(isFollowing ? 'Vous ne suivez plus cette personne' : 'Vous suivez maintenant cette personne');
    },
    onError: (error: any) => {
      console.error('Erreur toggle follow:', error);
      toast.error('Erreur lors de l\'opération');
    },
  });

  return {
    isFollowing,
    toggleFollow: toggleFollow.mutate,
    isLoading: toggleFollow.isPending,
  };
};

// Hook pour obtenir le nombre de followers
export const useFollowersCount = (userId?: string) => {
  return useQuery({
    queryKey: ['followers-count', userId],
    queryFn: async () => {
      if (!userId) return 0;

      const { count, error } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      if (error) {
        console.error('Erreur comptage followers:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!userId,
  });
};

// Hook pour obtenir le nombre de following
export const useFollowingCount = (userId?: string) => {
  return useQuery({
    queryKey: ['following-count', userId],
    queryFn: async () => {
      if (!userId) return 0;

      const { count, error } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

      if (error) {
        console.error('Erreur comptage following:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!userId,
  });
};
