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
        .select('user_id, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (!data || data.length === 0) return [];
      
      const userIds = data.map(like => like.user_id);
      
      // Récupérer les profils des utilisateurs
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, first_name, last_name')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Combiner les données
      return data.map(like => ({
        ...like,
        profiles: profiles?.find(p => p.id === like.user_id)
      }));
    },
    enabled: !!postId,
  });
};
