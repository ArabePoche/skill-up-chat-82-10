/**
 * Hook pour récupérer les vidéos (lessons) likées par l'utilisateur
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserLikedVideos = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-liked-videos', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('lesson_video_likes')
        .select(`
          lesson_id,
          lessons (
            id,
            title,
            description,
            video_url,
            duration,
            levels (
              id,
              title,
              formation_id,
              formations (
                id,
                title,
                thumbnail_url
              )
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data?.map(like => like.lessons).filter(Boolean) || [];
    },
    enabled: !!userId,
  });
};
