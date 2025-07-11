import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const VIDEOS_PER_PAGE = 10;

export const useInfiniteVideos = () => {
  return useInfiniteQuery({
    queryKey: ['infinite-videos'],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * VIDEOS_PER_PAGE;
      const to = from + VIDEOS_PER_PAGE - 1;

      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          profiles:author_id (
            first_name,
            last_name,
            username,
            avatar_url
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching videos:', error);
        throw error;
      }

      return data || [];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === VIDEOS_PER_PAGE ? allPages.length : undefined;
    },
    initialPageParam: 0,
    select: (data) => {
      // S'assurer que nous retournons toujours un tableau, même si data est undefined
      if (!data || !data.pages) {
        return [];
      }
      return data.pages.flat();
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
