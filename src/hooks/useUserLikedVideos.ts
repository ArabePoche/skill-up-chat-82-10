import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserLikedVideos = (userId?: string) => {
  return useQuery({
    queryKey: ['user-liked-videos', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Récupérer les vidéos likées par l'utilisateur
      const { data: likes, error: likesError } = await supabase
        .from('lesson_video_likes')
        .select('lesson_id')
        .eq('user_id', userId);

      if (likesError) {
        console.error('Error fetching video likes:', likesError);
        return [];
      }

      if (!likes || likes.length === 0) return [];

      const lessonIds = likes.map(like => like.lesson_id);

      // Récupérer les leçons
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          *,
          levels!inner(
            id,
            title,
            formation_id,
            formations!inner(
              id,
              title,
              thumbnail_url
            )
          )
        `)
        .in('id', lessonIds);

      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError);
        return [];
      }

      return lessons || [];
    },
    enabled: !!userId,
  });
};
