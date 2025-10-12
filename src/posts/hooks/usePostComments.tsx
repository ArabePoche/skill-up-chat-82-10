import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
            avatar_url
          ),
          replied_to_profile:profiles!post_comments_replied_to_user_id_fkey(
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur récupération commentaires post:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!postId,
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
            avatar_url
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
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

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