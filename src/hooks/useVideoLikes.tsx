
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useVideoLikes = (videoId: string, initialLikesCount: number = 0) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query pour récupérer le statut de like de l'utilisateur
  const { data: userLike } = useQuery({
    queryKey: ['video-like', videoId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('video_likes')
        .select('*')
        .eq('video_id', videoId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user like:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id && !!videoId,
  });

  // Query pour récupérer le nombre total de likes
  const { data: likesCount = initialLikesCount } = useQuery({
    queryKey: ['video-likes-count', videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('likes_count')
        .eq('id', videoId)
        .single();

      if (error) {
        console.error('Error fetching likes count:', error);
        return initialLikesCount;
      }
      
      return data?.likes_count || initialLikesCount;
    },
    enabled: !!videoId,
  });

  // Mutation pour liker/unliker
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      if (userLike) {
        // Unlike
        const { error } = await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('video_likes')
          .insert({ video_id: videoId, user_id: user.id });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      // Invalider les queries pour mettre à jour les données
      queryClient.invalidateQueries({ queryKey: ['video-like', videoId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['video-likes-count', videoId] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
    onError: (error) => {
      console.error('Error toggling like:', error);
    },
  });

  return {
    isLiked: !!userLike,
    likesCount,
    toggleLike: likeMutation.mutate,
    isLoading: likeMutation.isPending,
  };
};
