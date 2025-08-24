import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffect } from 'react';

// Fonction pour mettre à jour le champ comments_count dans la table `videos` (optionnel mais utile)
const updateCommentsCount = async (videoId: string) => {
  const { count, error: countError } = await supabase
    .from('video_comments')
    .select('*', { count: 'exact', head: true })
    .eq('video_id', videoId)
    .is('parent_comment_id', null); // Ne compte que les commentaires principaux

  if (countError) {
    console.error('Erreur comptage commentaires :', countError);
    return;
  }

  const { error: updateError } = await supabase
    .from('videos')
    .update({ comments_count: count })
    .eq('id', videoId);

  if (updateError) {
    console.error('Erreur mise à jour comments_count :', updateError);
  }
};

export const useVideoComments = (videoId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 🔁 Récupère tous les commentaires (avec profils et réponses)
  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ['video-comments', videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_comments')
        .select(`
          *,
          profiles!video_comments_user_id_fkey(
            id,
            username,
            first_name,
            last_name,
            avatar_url
          ),
          replies:video_comments!parent_comment_id(
            *,
            profiles!video_comments_user_id_fkey(
              id,
              username,
              first_name,
              last_name,
              avatar_url
            )
          )
        `)
        .eq('video_id', videoId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur récupération commentaires :', error);
        return [];
      }

      return data || [];
    },
    enabled: !!videoId,
  });

  // 🔢 Récupère dynamiquement le compteur de commentaires (racines uniquement)
  const {
    data: commentsCount = 0,
    isLoading: isCountLoading,
  } = useQuery({
    queryKey: ['video-comments-count', videoId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('video_comments')
        .select('*', { count: 'exact' })
        .eq('video_id', videoId)
        .is('parent_comment_id', null);

      if (error) {
        console.error('Erreur comptage commentaires :', error);
        return 0;
      }

      return count ?? 0;
    },
    enabled: !!videoId,
  });

  // ✍️ Mutation pour ajouter un commentaire
  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!user?.id) throw new Error('Utilisateur non connecté');

      const { data, error } = await supabase
        .from('video_comments')
        .insert({
          video_id: videoId,
          user_id: user.id,
          content,
          parent_comment_id: parentId || null,
        })
        .select(`
          *,
          profiles!video_comments_user_id_fkey(
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      // Met à jour le champ comments_count (si commentaire principal)
      if (!parentId) {
        await updateCommentsCount(videoId);
      }

      return data;
    },
    onSuccess: () => {
      // ✅ Invalide ET refetch manuellement pour affichage immédiat
      queryClient.invalidateQueries({ queryKey: ['video-comments', videoId] });
      queryClient.invalidateQueries({ queryKey: ['video-comments-count', videoId] });
      queryClient.refetchQueries({ queryKey: ['video-comments-count', videoId] });
    },
    onError: (error) => {
      console.error('Erreur ajout commentaire :', error);
    },
  });

  // Fonction utilisable depuis les composants
  const addComment = async (content: string, parentId?: string): Promise<boolean> => {
    try {
      await addCommentMutation.mutateAsync({ content, parentId });
      return true;
    } catch (error) {
      console.error('Échec ajout commentaire :', error);
      return false;
    }
  };

 

  return {
    comments,
    commentsCount,
    isLoading: isCommentsLoading || isCountLoading,
    addComment,
    isSubmitting: addCommentMutation.isPending,
  };
};
