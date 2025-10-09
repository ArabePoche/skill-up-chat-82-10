import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserLikedVideos = (userId?: string) => {
  return useQuery({
    queryKey: ['user-liked-videos', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Récupérer les vidéos likées par l'utilisateur
      const { data: likes, error: likesError } = await supabase
        .from('video_likes')
        .select('video_id')
        .eq('user_id', userId);

      if (likesError) {
        console.error('Error fetching video likes:', likesError);
        return [];
      }

      if (!likes || likes.length === 0) return [];

      const videoIds = likes.map(like => like.video_id);

      // Récupérer les vidéos
      const { data: videos, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .in('id', videoIds);

      if (videosError) {
        console.error('Error fetching videos:', videosError);
        return [];
      }

      return videos || [];
    },
    enabled: !!userId,
  });
};
