/**
 * Hook pour gérer les commentaires des vidéos de leçon
 * Utilise la table lesson_video_comments (FK vers lessons)
 * Contrairement à useVideoComments qui utilise video_comments (FK vers videos)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useLessonVideoComments = (lessonId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ['lesson-video-comments', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_video_comments')
        .select(`
          *,
          profiles:user_id(
            id,
            username,
            first_name,
            last_name,
            avatar_url,
            is_verified
          )
        `)
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur récupération commentaires leçon:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!lessonId,
  });

  const { data: commentsCount = 0 } = useQuery({
    queryKey: ['lesson-video-comments-count', lessonId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('lesson_video_comments')
        .select('*', { count: 'exact', head: true })
        .eq('lesson_id', lessonId);

      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!lessonId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      if (!user?.id) throw new Error('Non connecté');

      const { data, error } = await supabase
        .from('lesson_video_comments')
        .insert({
          lesson_id: lessonId,
          user_id: user.id,
          content,
        })
        .select(`
          *,
          profiles:user_id(
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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-video-comments', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['lesson-video-comments-count', lessonId] });
    },
  });

  const addComment = async (content: string): Promise<boolean> => {
    try {
      await addCommentMutation.mutateAsync({ content });
      return true;
    } catch (error) {
      console.error('Erreur ajout commentaire leçon:', error);
      return false;
    }
  };

  return {
    comments,
    commentsCount,
    isLoading: isCommentsLoading,
    addComment,
    isSubmitting: addCommentMutation.isPending,
  };
};
