
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useVideoLikes = (videoId: string, initialLikesCount: number) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && videoId) {
      checkIfLiked();
    }
  }, [user, videoId]);

  const checkIfLiked = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('video_likes')
        .select('id')
        .eq('video_id', videoId)
        .eq('user_id', user.id)
        .maybeSingle();

      setIsLiked(!!data);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const toggleLike = async () => {
    if (!user) {
      toast.error('Connectez-vous pour liker cette vidéo');
      return;
    }

    if (isLoading) return;
    setIsLoading(true);

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);

        if (error) throw error;
        
        setLikesCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
        toast.success('Like retiré');
      } else {
        // Like
        const { error } = await supabase
          .from('video_likes')
          .insert({ 
            video_id: videoId, 
            user_id: user.id 
          });

        if (error) throw error;
        
        setLikesCount(prev => prev + 1);
        setIsLiked(true);
        toast.success('Vidéo likée !');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Erreur lors du like');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLiked,
    likesCount,
    toggleLike,
    isLoading
  };
};
