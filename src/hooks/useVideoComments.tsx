import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoComment {
  id: string;
  content: string;
  likes_count: number;
  created_at: string;
  parent_comment_id?: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
  };
  replies?: VideoComment[];
}

export const useVideoComments = (videoId: string) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (videoId) {
      fetchComments();
    }
  }, [videoId]);

  const fetchComments = async () => {
    if (!videoId) return;
    
    setIsLoading(true);
    try {
      // Récupérer les commentaires principaux et leurs réponses
      const { data, error } = await supabase
        .from('video_comments')
        .select(`
          id,
          content,
          likes_count,
          created_at,
          parent_comment_id,
          profiles (
            first_name,
            last_name,
            username,
            avatar_url
          )
        `)
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Organiser les commentaires avec leurs réponses
      const mainComments = data?.filter(comment => !comment.parent_comment_id) || [];
      const replies = data?.filter(comment => comment.parent_comment_id) || [];

      const commentsWithReplies = mainComments.map(comment => ({
        ...comment,
        replies: replies.filter(reply => reply.parent_comment_id === comment.id)
      }));

      setComments(commentsWithReplies);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Erreur lors du chargement des commentaires');
    } finally {
      setIsLoading(false);
    }
  };

  const addComment = async (content: string, parentCommentId?: string) => {
    if (!user || !content.trim()) return false;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('video_comments')
        .insert({
          video_id: videoId,
          user_id: user.id,
          content: content.trim(),
          parent_comment_id: parentCommentId || null
        })
        .select(`
          id,
          content,
          likes_count,
          created_at,
          parent_comment_id,
          profiles (
            first_name,
            last_name,
            username,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      // Mettre à jour le compteur de commentaires de la vidéo (optionnel)
      // Note: Le compteur sera recalculé dynamiquement côté front-end

      // Refetch les commentaires pour avoir la structure complète
      await fetchComments();
      
      toast.success(parentCommentId ? 'Réponse ajoutée !' : 'Commentaire ajouté !');
      return true;
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Erreur lors de l\'ajout du commentaire');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    comments,
    isLoading,
    isSubmitting,
    addComment,
    refreshComments: fetchComments
  };
};