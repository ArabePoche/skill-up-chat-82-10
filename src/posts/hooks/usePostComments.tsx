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

  // Ajouter un commentaire
  const addCommentMutation = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      if (!user?.id) throw new Error('Utilisateur non connecté');

      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content,
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

  const addComment = async (content: string): Promise<boolean> => {
    try {
      await addCommentMutation.mutateAsync({ content });
      return true;
    } catch (error) {
      console.error('Échec ajout commentaire:', error);
      return false;
    }
  };

  return {
    comments,
    isLoading,
    addComment,
    isSubmitting: addCommentMutation.isPending,
  };
};