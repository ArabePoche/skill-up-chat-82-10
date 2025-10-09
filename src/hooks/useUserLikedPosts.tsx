import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserLikedPosts = (userId?: string) => {
  return useQuery({
    queryKey: ['user-liked-posts', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Récupérer les posts likés par l'utilisateur
      const { data: likes, error: likesError } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId);

      if (likesError) {
        console.error('Error fetching likes:', likesError);
        return [];
      }

      if (!likes || likes.length === 0) return [];

      const postIds = likes.map(like => like.post_id);

      // Récupérer les posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .in('id', postIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        return [];
      }

      // Récupérer les profils des auteurs
      const authorIds = [...new Set(posts.map(post => post.author_id))];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url')
        .in('id', authorIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Combiner les données
      const postsWithProfiles = posts.map(post => {
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

      // Charger les médias associés aux posts
      const { data: media, error: mediaError } = await supabase
        .from('post_media')
        .select('id, post_id, file_url, file_type, order_index, created_at')
        .in('post_id', postIds)
        .order('order_index', { ascending: true });

      if (mediaError) {
        console.error('Error fetching post media:', mediaError);
      }

      const mediaByPost = (media || []).reduce((acc: Record<string, any[]>, m) => {
        (acc[m.post_id] ||= []).push(m);
        return acc;
      }, {} as Record<string, any[]>);

      const postsWithProfilesAndMedia = postsWithProfiles.map(p => ({
        ...p,
        media: mediaByPost[p.id] || []
      }));

      return postsWithProfilesAndMedia;
    },
    enabled: !!userId,
  });
};
