/**
 * Hook pour récupérer la série d'une vidéo
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useVideoSeries = (videoId: string | undefined) => {
  return useQuery({
    queryKey: ['video-series', videoId],
    queryFn: async () => {
      if (!videoId) return null;

      // Récupérer la série de la vidéo
      const { data: seriesVideoData, error: seriesError } = await supabase
        .from('series_videos')
        .select(`
          series_id,
          series (
            id,
            title,
            description,
            user_id
          )
        `)
        .eq('video_id', videoId)
        .single();

      if (seriesError || !seriesVideoData) return null;

      // Récupérer tous les épisodes de la série
      const { data: episodes, error: episodesError } = await supabase
        .from('series_videos')
        .select(`
          video_id,
          order_index,
          videos (
            id,
            title,
            thumbnail_url,
            video_url
          )
        `)
        .eq('series_id', seriesVideoData.series_id)
        .order('order_index', { ascending: true });

      if (episodesError) throw episodesError;

      return {
        series: seriesVideoData.series,
        episodes: episodes || [],
      };
    },
    enabled: !!videoId,
  });
};
