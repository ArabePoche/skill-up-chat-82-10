
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useVideoComments = (videoId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query pour récupérer les commentaires
  const { data: comments = [], isLoading } = useQuery({
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
        console.error('Error fetching comments:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!videoId,
  });

  // Query pour récupérer le nombre total de commentaires
  const { data: commentsCount = 0 } = useQuery({
    queryKey: ['video-comments-count', videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('comments_count')
        .eq('id', videoId)
        .single();

      if (error) {
        console.error('Error fetching comments count:', error);
        return 0;
      }
      
      return data?.comments_count || 0;
    },
    enabled: !!videoId,
  });

  // Mutation pour ajouter un commentaire
  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

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
      return data;
    },
    onSuccess: () => {
      // Invalider les queries pour mettre à jour les données
      queryClient.invalidateQueries({ queryKey: ['video-comments', videoId] });
      queryClient.invalidateQueries({ queryKey: ['video-comments-count', videoId] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
    onError: (error) => {
      console.error('Error adding comment:', error);
    },
  });

  // Function to add a comment with proper return type
  const addComment = async (content: string, parentId?: string): Promise<boolean> => {
    try {
      await addCommentMutation.mutateAsync({ content, parentId });
      return true;
    } catch (error) {
      console.error('Failed to add comment:', error);
      return false;
    }
  };

  return {
    comments,
    commentsCount,
    isLoading,
    addComment,
    isSubmitting: addCommentMutation.isPending,
  };
};