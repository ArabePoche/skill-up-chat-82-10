import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useLessonCommentLikes = (commentId: string, initialLikesCount: number = 0) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && commentId) {
      checkIfLiked();
    }
  }, [user, commentId]);

  const checkIfLiked = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('lesson_video_comment_likes')
        .select('*')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking like status:', error);
        return;
      }

      setIsLiked(!!data);
    } catch (error) {
      console.error('Error checking comment like status:', error);
    }
  };

  const toggleLike = async () => {
    if (!user) {
      toast.error('Connectez-vous pour liker ce commentaire');
      return;
    }

    if (isLoading) return;
    setIsLoading(true);

    try {
      if (isLiked) {
        // Unlike
        const { error: deleteError } = await supabase
          .from('lesson_video_comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        // Décrémenter le compteur
        // Note: Idéalement, on utiliserait une fonction RPC ou un trigger pour la cohérence
        // mais pour l'instant on fait une mise à jour optimiste + DB
        
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        // Like
        const { error: insertError } = await supabase
          .from('lesson_video_comment_likes')
          .insert({ 
            comment_id: commentId, 
            user_id: user.id 
          });

        if (insertError) throw insertError;

        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error: any) {
      console.error('Error toggling comment like:', error);
      toast.error(`Erreur lors du like: ${error.message || 'Erreur inconnue'}`);
      // Revert state in case of error
      setIsLiked(!isLiked);
      setLikesCount(isLiked ? likesCount + 1 : Math.max(0, likesCount - 1));
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
