/**
 * Hook pour récupérer les vidéos d'une série
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSeriesVideos = (seriesId: string | undefined) => {
  return useQuery({
    queryKey: ['series-videos', seriesId],
    queryFn: async () => {
      if (!seriesId) return [];

      const { data, error } = await supabase
        .from('series_videos')
        .select(`
          *,
          videos (
            id,
            title,
            thumbnail_url,
            video_url,
            created_at
          )
        `)
        .eq('series_id', seriesId)
        .order('order_index', { ascending: true });

      if (error) throw error;

      return data || [];
    },
    enabled: !!seriesId,
  });
};
