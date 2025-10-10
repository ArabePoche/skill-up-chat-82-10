/**
 * Hook pour récupérer les vidéos créées par l'utilisateur
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserVideos = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-videos', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data: videos, error } = await supabase
        .from('videos')
        .select('*')
        .eq('author_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!videos || videos.length === 0) return [];

      // Récupérer le profil de l'auteur
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url')
        .eq('id', userId)
        .single();

      return videos.map(video => ({
        ...video,
        profiles: profile || null
      }));
    },
    enabled: !!userId,
  });
};
