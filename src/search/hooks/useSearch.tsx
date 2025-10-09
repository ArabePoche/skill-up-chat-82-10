/**
 * Hook pour gérer la recherche de vidéos, posts et utilisateurs
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type SearchFilter = 'all' | 'videos' | 'posts' | 'users';

export const useSearch = (query: string, filter: SearchFilter) => {
  return useQuery({
    queryKey: ['search', query, filter],
    queryFn: async () => {
      if (!query.trim()) return { videos: [], posts: [], users: [] };

      const results = {
        videos: [] as any[],
        posts: [] as any[],
        users: [] as any[],
      };

      // Recherche de vidéos
      if (filter === 'all' || filter === 'videos') {
        const { data: videos } = await supabase
          .from('videos')
          .select('*')
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(20);
        
        if (videos && videos.length > 0) {
          const authorIds = [...new Set(videos.map(v => v.author_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, username, avatar_url')
            .in('id', authorIds);
          
          results.videos = videos.map(video => ({
            ...video,
            profiles: profiles?.find(p => p.id === video.author_id) || null
          }));
        }
      }

      // Recherche de posts
      if (filter === 'all' || filter === 'posts') {
        const { data: posts } = await supabase
          .from('posts')
          .select('*')
          .eq('is_active', true)
          .ilike('content', `%${query}%`)
          .limit(20);
        
        if (posts && posts.length > 0) {
          const authorIds = [...new Set(posts.map(p => p.author_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, username, avatar_url')
            .in('id', authorIds);
          
          results.posts = posts.map(post => ({
            ...post,
            profiles: profiles?.find(p => p.id === post.author_id) || null
          }));
        }
      }

      // Recherche d'utilisateurs
      if (filter === 'all' || filter === 'users') {
        const { data: users } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
          .limit(20);
        
        results.users = users || [];
      }

      return results;
    },
    enabled: query.trim().length > 0,
    staleTime: 10000,
  });
};
