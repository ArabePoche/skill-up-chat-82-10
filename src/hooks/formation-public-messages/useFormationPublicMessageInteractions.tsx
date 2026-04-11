import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFileUpload } from '@/hooks/useFileUpload';

export interface FormationPublicMessageComment {
  id: string;
  message_id: string;
  user_id: string;
  comment_type: 'text' | 'audio';
  content: string | null;
  audio_url: string | null;
  audio_path: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    username?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

export const useFormationPublicMessageInteractions = (messageId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { uploadFile } = useFileUpload();

  const likesCountQuery = useQuery({
    queryKey: ['formation-public-message-likes-count', messageId],
    enabled: !!messageId,
    queryFn: async () => {
      if (!messageId) {
        return 0;
      }

      const { count, error } = await supabase
        .from('formation_public_message_likes')
        .select('*', { count: 'exact', head: true })
        .eq('message_id', messageId);

      if (error) {
        throw error;
      }

      return count ?? 0;
    },
  });

  const userLikeQuery = useQuery({
    queryKey: ['formation-public-message-like', messageId, user?.id],
    enabled: !!messageId && !!user?.id,
    queryFn: async () => {
      if (!messageId || !user?.id) {
        return null;
      }

      const { data, error } = await supabase
        .from('formation_public_message_likes')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
  });

  const commentsQuery = useQuery({
    queryKey: ['formation-public-message-comments', messageId],
    enabled: !!messageId,
    queryFn: async (): Promise<FormationPublicMessageComment[]> => {
      if (!messageId) {
        return [];
      }

      const { data, error } = await supabase
        .from('formation_public_message_comments')
        .select(`
          *,
          profiles!formation_public_message_comments_user_id_fkey(
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('message_id', messageId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []) as FormationPublicMessageComment[];
    },
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['formation-public-message-likes-count', messageId] });
    await queryClient.invalidateQueries({ queryKey: ['formation-public-message-like', messageId, user?.id] });
    await queryClient.invalidateQueries({ queryKey: ['formation-public-message-comments', messageId] });
  };

  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      if (!messageId || !user?.id) {
        throw new Error('Utilisateur non authentifié');
      }

      if (userLikeQuery.data) {
        const { error } = await supabase
          .from('formation_public_message_likes')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }

        return;
      }

      const { error } = await supabase.from('formation_public_message_likes').insert({
        message_id: messageId,
        user_id: user.id,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void invalidate();
    },
  });

  const addTextCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!messageId || !user?.id) {
        throw new Error('Utilisateur non authentifié');
      }

      const trimmedContent = content.trim();
      if (!trimmedContent) {
        throw new Error('Le commentaire ne peut pas être vide.');
      }

      const { error } = await supabase.from('formation_public_message_comments').insert({
        message_id: messageId,
        user_id: user.id,
        comment_type: 'text',
        content: trimmedContent,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void invalidate();
    },
  });

  const addAudioCommentMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!messageId || !user?.id) {
        throw new Error('Utilisateur non authentifié');
      }

      const uploadResult = await uploadFile(file, 'lesson_discussion_files');

      const { error } = await supabase.from('formation_public_message_comments').insert({
        message_id: messageId,
        user_id: user.id,
        comment_type: 'audio',
        audio_url: uploadResult.fileUrl,
        audio_path: uploadResult.filePath,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void invalidate();
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!user?.id) {
        throw new Error('Utilisateur non authentifié');
      }

      const { error } = await supabase
        .from('formation_public_message_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void invalidate();
    },
  });

  const comments = commentsQuery.data ?? [];

  const commentsCount = useMemo(() => comments.length, [comments]);

  return {
    isLiked: !!userLikeQuery.data,
    likesCount: likesCountQuery.data ?? 0,
    comments,
    commentsCount,
    isLoading: likesCountQuery.isLoading || commentsQuery.isLoading,
    isTogglingLike: toggleLikeMutation.isPending,
    isSubmittingTextComment: addTextCommentMutation.isPending,
    isSubmittingAudioComment: addAudioCommentMutation.isPending,
    isDeletingComment: deleteCommentMutation.isPending,
    toggleLike: () => toggleLikeMutation.mutate(),
    addTextComment: (content: string) => addTextCommentMutation.mutateAsync(content),
    addAudioComment: (file: File) => addAudioCommentMutation.mutateAsync(file),
    deleteComment: (commentId: string) => deleteCommentMutation.mutateAsync(commentId),
  };
};