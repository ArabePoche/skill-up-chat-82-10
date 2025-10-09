/**
 * Hook pour récupérer les posts likés par l'utilisateur
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserLikedPosts = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-liked-posts', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (!data || data.length === 0) return [];
      
      const postIds = data.map(like => like.post_id);
      
      // 1) Récupérer les posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .in('id', postIds)
        .order('created_at', { ascending: false });
      
      if (postsError) throw postsError;
      if (!posts || posts.length === 0) return [];

      // 2) Récupérer les profils des auteurs (comme usePosts)
      const authorIds = [...new Set(posts.map(p => p.author_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url')
        .in('id', authorIds);
      if (profilesError) {
        console.error('Error fetching profiles for liked posts:', profilesError);
      }

      const postsWithProfiles = posts.map((post: any) => {
        const profile = profiles?.find(p => p.id === post.author_id);
        return {
          ...post,
          profiles: profile ? {
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            username: profile.username || '',
            avatar_url: profile.avatar_url || ''
          } : {
            first_name: 'Utilisateur',
            last_name: '',
            username: 'user',
            avatar_url: ''
          }
        };
      });

      // 3) Récupérer les médias associés
      const { data: media, error: mediaError } = await supabase
        .from('post_media')
        .select('id, post_id, file_url, file_type, order_index, created_at')
        .in('post_id', postIds)
        .order('order_index', { ascending: true });
      if (mediaError) {
        console.error('Error fetching media for liked posts:', mediaError);
      }
      const mediaByPost = (media || []).reduce((acc: Record<string, any[]>, m: any) => {
        (acc[m.post_id] ||= []).push(m);
        return acc;
      }, {} as Record<string, any[]>);

      return postsWithProfiles.map((p: any) => ({
        ...p,
        media: mediaByPost[p.id] || []
      }));
    },
    enabled: !!userId,
  });
};
