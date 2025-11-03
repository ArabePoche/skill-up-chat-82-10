/**
 * Hook pour gérer les likes des commentaires de posts
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const usePostCommentLikes = (commentId: string, initialLikesCount: number) => {
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
      const { data } = await supabase
        .from('post_comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .maybeSingle();

      setIsLiked(!!data);
    } catch (error) {
      console.error('Error checking post comment like status:', error);
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
        const { error } = await supabase
          .from('post_comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);

        if (error) throw error;

        // Décrémenter le compteur dans la table post_comments
        await supabase
          .from('post_comments')
          .update({ 
            likes_count: Math.max(0, likesCount - 1)
          })
          .eq('id', commentId);
        
        setLikesCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
      } else {
        // Like
        const { error } = await supabase
          .from('post_comment_likes')
          .insert({ 
            comment_id: commentId, 
            user_id: user.id 
          });

        if (error) throw error;

        // Incrémenter le compteur dans la table post_comments
        await supabase
          .from('post_comments')
          .update({ 
            likes_count: likesCount + 1
          })
          .eq('id', commentId);
        
        setLikesCount(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling post comment like:', error);
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
