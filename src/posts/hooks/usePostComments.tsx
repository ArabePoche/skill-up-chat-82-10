import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { notifyHabbahGain } from '@/hooks/useHabbahGainNotifier';
import { recordHabbahGain, reverseHabbahGain } from '@/services/habbahService';

export const usePostComments = (postId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer les commentaires d'un post
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          profiles!post_comments_user_id_fkey(
            id,
            username,
            first_name,
            last_name,
            avatar_url,
            is_verified
          ),
          replied_to_profile:profiles!post_comments_replied_to_user_id_fkey1(
            id,
            username,
            first_name,
            last_name,
            avatar_url,
            is_verified
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erreur récupération commentaires post:', error);
        return [];
      }

      // Normaliser replied_to_profile (tableau vers objet unique)
      const normalizedData = (data || []).map(comment => ({
        ...comment,
        replied_to_profile: Array.isArray(comment.replied_to_profile) 
          ? comment.replied_to_profile[0] 
          : comment.replied_to_profile
      }));

      return normalizedData;
    },
    enabled: !!postId,
    refetchOnMount: true,
    staleTime: 0,
  });

  // Ajouter un commentaire ou une réponse
  const addCommentMutation = useMutation({
    mutationFn: async ({ 
      content, 
      parentCommentId, 
      repliedToUserId 
    }: { 
      content: string; 
      parentCommentId?: string;
      repliedToUserId?: string;
    }) => {
      if (!user?.id) throw new Error('Utilisateur non connecté');

      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content,
          parent_comment_id: parentCommentId || null,
          replied_to_user_id: repliedToUserId || null,
        })
        .select(`
          *,
          profiles!post_comments_user_id_fkey(
            id,
            username,
            first_name,
            last_name,
            avatar_url,
            is_verified
          )
        `)
        .single();

      if (error) throw error;

      // Utiliser la fonction RPC pour incrémenter le compteur
      const { error: rpcError } = await supabase.rpc('increment_post_comments', {
        post_id: postId
      });
      
      if (rpcError) {
        console.error('Erreur mise à jour compteur commentaires:', rpcError);
      }

      if (user?.id) {
        const reward = await recordHabbahGain(user.id, 'post_comment', data.id);
        if (reward) notifyHabbahGain(reward.amount, reward.label);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Commentaire ajouté !');
    },
    onError: (error) => {
      console.error('Erreur ajout commentaire:', error);
      toast.error('Erreur lors de l\'ajout du commentaire');
    },
  });

  const addComment = async (
    content: string, 
    parentCommentId?: string,
    repliedToUserId?: string
  ): Promise<boolean> => {
    try {
      await addCommentMutation.mutateAsync({ content, parentCommentId, repliedToUserId });
      return true;
    } catch (error) {
      console.error('Échec ajout commentaire:', error);
      return false;
    }
  };

  // Supprimer un commentaire
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!user?.id) throw new Error('Utilisateur non connecté');

      const { data: deletedComments, error: lookupError } = await supabase
        .from('post_comments')
        .select('id, user_id')
        .or(`id.eq.${commentId},parent_comment_id.eq.${commentId}`);

      if (lookupError) throw lookupError;

      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;

      for (const comment of deletedComments || []) {
        if (comment.user_id === user.id) {
          const reversal = await reverseHabbahGain(user.id, 'post_comment', comment.id, 'post_comment_deleted');
          if (reversal) {
            notifyHabbahGain(-reversal.amount, reversal.label);
          }
        }
      }

      // Décrémenter le compteur
      const { error: rpcError } = await supabase.rpc('decrement_post_comments', {
        post_id: postId
      });
      
      if (rpcError) {
        console.error('Erreur mise à jour compteur commentaires:', rpcError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['post-comments-count', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Commentaire supprimé');
    },
    onError: (error) => {
      console.error('Erreur suppression commentaire:', error);
      toast.error('Erreur lors de la suppression');
    },
  });

  const deleteComment = async (commentId: string): Promise<boolean> => {
    try {
      await deleteCommentMutation.mutateAsync(commentId);
      return true;
    } catch (error) {
      console.error('Échec suppression commentaire:', error);
      return false;
    }
  };

  return {
    comments,
    isLoading,
    addComment,
    deleteComment,
    isSubmitting: addCommentMutation.isPending,
    isDeleting: deleteCommentMutation.isPending,
  };
};