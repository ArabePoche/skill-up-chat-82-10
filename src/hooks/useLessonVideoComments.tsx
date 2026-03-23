/**
 * Hook pour gérer les commentaires des vidéos de leçon
 * Utilise la table lesson_video_comments (FK vers lessons)
 * Contrairement à useVideoComments qui utilise video_comments (FK vers videos)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';


interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  lesson_id: string;
  parent_id?: string | null;
  profiles?: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
    is_verified?: boolean;
  };
  replies?: Comment[];
  likes_count?: number;
}

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
        .order('created_at', { ascending: true }); // Order by creation time for correct threading

      if (error) {
        console.error('Erreur récupération commentaires leçon:', error);
        return [];
      }
      
      // Organiser les commentaires en structure hiérarchique
      const commentMap = new Map();
      const rootComments: Comment[] = [];

      // D'abord créer une map de tous les commentaires
      data?.forEach((comment: any) => {
        comment.replies = [];
        commentMap.set(comment.id, comment);
      });

      // Ensuite organiser la hiérarchie
      data?.forEach((comment: any) => {
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id);
          if (parent) {
            parent.replies.push(comment);
          } else {
            // Si parent non trouvé (ex: supprimé), traiter comme racine ou ignorer
            rootComments.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      // Trier les racines par date décroissante (plus récents en premier)
      return rootComments.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
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
    mutationFn: async ({ content, parentId }: { content: string, parentId?: string }) => {
      if (!user?.id) throw new Error('Non connecté');

      const { data, error } = await supabase
        .from('lesson_video_comments')
        .insert({
          lesson_id: lessonId,
          user_id: user.id,
          content,
          parent_id: parentId
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

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!user?.id) throw new Error('Non connecté');
      
      const { error } = await supabase
        .from('lesson_video_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id); // Sécurité supplémentaire : seul l'auteur peut supprimer

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-video-comments', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['lesson-video-comments-count', lessonId] });
    },
  });

  const addComment = async (content: string, parentId?: string): Promise<boolean> => {
    try {
      await addCommentMutation.mutateAsync({ content, parentId });
      return true;
    } catch (error) {
      console.error('Erreur ajout commentaire leçon:', error);
      return false;
    }
  };

  const deleteComment = async (commentId: string): Promise<boolean> => {
    try {
      await deleteCommentMutation.mutateAsync(commentId);
      return true;
    } catch (error) {
      console.error('Erreur suppression commentaire:', error);
      return false;
    }
  };

  return {
    comments,
    commentsCount,
    isLoading: isCommentsLoading,
    addComment,
    deleteComment,
    isSubmitting: addCommentMutation.isPending || deleteCommentMutation.isPending,
  };
};

