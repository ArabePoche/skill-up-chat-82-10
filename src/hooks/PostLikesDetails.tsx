import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook pour récupérer les détails des utilisateurs qui ont liké un post
 */
export const usePostLikesDetails = (postId: string) => {
  return useQuery({
    queryKey: ['post-likes-details', postId],
    queryFn: async () => {
      // Récupérer les likes
      const { data: likes, error: likesError } = await supabase
        .from('post_likes')
        .select('id, created_at, user_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (likesError) {
        console.error('Erreur récupération likes :', likesError);
        return [];
      }

      if (!likes || likes.length === 0) return [];

      // Récupérer les profils des utilisateurs
      const userIds = likes.map(like => like.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, username, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Erreur récupération profils :', profilesError);
        return likes.map(like => ({ ...like, profiles: null }));
      }

      // Combiner les likes avec les profils
      return likes.map(like => ({
        ...like,
        profiles: profiles?.find(p => p.id === like.user_id) || null
      }));
    },
    enabled: !!postId,
  });
};
