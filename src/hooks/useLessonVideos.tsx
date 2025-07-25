
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useLessonVideos = () => {
  return useQuery({
    queryKey: ['lesson-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          video_url,
          thumbnail_url,
          profiles:author_id (
            first_name,
            last_name,
            username
          )
        `)
        .eq('video_type', 'lesson' as any) // Cast explicite pour éviter l'erreur TypeScript
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching lesson videos:', error);
        return [];
      }

      return data || [];
    },
  });
};