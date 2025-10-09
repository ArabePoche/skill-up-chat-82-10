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
        .select(`
          post_id,
          posts (
            *,
            profiles (
              id,
              username,
              avatar_url,
              first_name,
              last_name
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data?.map(like => like.posts).filter(Boolean) || [];
    },
    enabled: !!userId,
  });
};
