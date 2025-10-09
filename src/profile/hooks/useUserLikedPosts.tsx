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
      
      // Récupérer les posts avec leurs profils
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            id,
            username,
            avatar_url,
            first_name,
            last_name
          )
        `)
        .in('id', postIds);
      
      if (postsError) throw postsError;
      return posts || [];
    },
    enabled: !!userId,
  });
};
