/**
 * Hook pour récupérer les détails des likes d'un post
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePostLikesDetails = (postId: string | undefined) => {
  return useQuery({
    queryKey: ['post-likes-details', postId],
    queryFn: async () => {
      if (!postId) return [];

      const { data, error } = await supabase
        .from('post_likes')
        .select(`
          user_id,
          created_at,
          profiles (
            id,
            username,
            avatar_url,
            first_name,
            last_name
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!postId,
  });
};
