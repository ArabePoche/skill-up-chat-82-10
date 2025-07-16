import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useVideoLikes = (videoId: string, initialLikesCount: number = 0) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Vérifie si l'utilisateur a liké la vidéo
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
        console.error('Erreur récupération like utilisateur :', error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id && !!videoId,
  });

  // Compte dynamique des likes
  const { data: likesCount = initialLikesCount } = useQuery({
    queryKey: ['video-likes-count', videoId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('video_likes')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', videoId);

      if (error) {
        console.error('Erreur comptage likes :', error);
        return initialLikesCount;
      }

      return count ?? initialLikesCount;
    },
    enabled: !!videoId,
  });

  // Fonction de mutation like/unlike
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Utilisateur non authentifié');

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

      // Optionnel : mise à jour du champ likes_count dans la table videos
      await updateLikesCount(videoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-like', videoId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['video-likes-count', videoId] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
    onError: (error) => {
      console.error('Erreur lors du toggle like :', error);
    },
  });

  return {
    isLiked: !!userLike,
    likesCount,
    toggleLike: likeMutation.mutate,
    isLoading: likeMutation.isPending,
  };
};

// Fonction utilitaire pour synchroniser le champ likes_count
const updateLikesCount = async (videoId: string) => {
  const { count, error: countError } = await supabase
    .from('video_likes')
    .select('*', { count: 'exact', head: true })
    .eq('video_id', videoId);

  if (countError) {
    console.error('Erreur lors du comptage des likes :', countError);
    return;
  }

  const { error: updateError } = await supabase
    .from('videos')
    .update({ likes_count: count })
    .eq('id', videoId);

  if (updateError) {
    console.error('Erreur lors de la mise à jour de likes_count :', updateError);
  }
};
