import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { reverseHabbahGain } from '@/services/habbahService';
import { notifyHabbahGain } from '@/hooks/useHabbahGainNotifier';

export const useLessonVideoLikes = (lessonId: string, initialLikesCount: number = 0) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isLiked = false } = useQuery({
    queryKey: ['lesson-video-like', lessonId, user?.id],
    queryFn: async () => {
      if (!user?.id || !lessonId) return false;
      const { data, error } = await supabase
        .from('lesson_video_likes')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) return false;
      return !!data;
    },
    enabled: !!user?.id && !!lessonId,
  });

  const { data: likesCount = initialLikesCount } = useQuery({
    queryKey: ['lesson-video-likes-count', lessonId],
    queryFn: async () => {
      if (!lessonId) return initialLikesCount;
      const { count, error } = await supabase
        .from('lesson_video_likes')
        .select('*', { count: 'exact', head: true })
        .eq('lesson_id', lessonId);

      if (error) return initialLikesCount;
      return count || 0;
    },
    enabled: !!lessonId,
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      if (isLiked) {
        const { error } = await supabase
          .from('lesson_video_likes')
          .delete()
          .eq('lesson_id', lessonId)
          .eq('user_id', user.id);
        if (error) throw error;

        const reversal = await reverseHabbahGain(user.id, 'like', lessonId, 'lesson_video_unlike');
        if (reversal) {
          notifyHabbahGain(-reversal.amount, reversal.label);
        }
      } else {
        const { error } = await supabase
          .from('lesson_video_likes')
          .insert({ lesson_id: lessonId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-video-like', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['lesson-video-likes-count', lessonId] });
    },
    onError: (error) => {
      console.error('Erreur like:', error);
      toast.error('Erreur lors du like: ' + error.message);
    },
  });

  return {
    isLiked,
    likesCount,
    toggleLike: toggleLikeMutation.mutate,
    isLoading: toggleLikeMutation.isPending,
  };
};
