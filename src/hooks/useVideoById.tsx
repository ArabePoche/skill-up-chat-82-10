import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook pour récupérer une vidéo spécifique par son ID
 * Utile pour les liens directs /videos/:id
 */
export const useVideoById = (videoId: string | undefined) => {
  return useQuery({
    queryKey: ['video', videoId],
    queryFn: async () => {
      if (!videoId) return null;

      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          profiles:author_id (
            first_name,
            last_name,
            username,
            avatar_url,
            is_verified
          )
        `)
        .eq('id', videoId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }

        console.error('Error fetching video by id:', error);
        throw error;
      }

      return data;
    },
    enabled: !!videoId,
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });
};
