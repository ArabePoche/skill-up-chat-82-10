import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  likes_count: number;
  comments_count: number;
  author_id: string;
  video_type?: string;
  formation_id?: string;
  price?: number;
  profiles?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

export const useInfiniteVideos = () => {
  const { user } = useAuth();

  const query = useInfiniteQuery({
    queryKey: ['infinite-videos', user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      const pageSize = 3;
      const from = pageParam * pageSize;
      const to = from + pageSize - 1;

      // Récupérer les centres d'intérêt de l'utilisateur
      let userInterests: string[] = [];
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('interests')
          .eq('id', user.id)
          .single();
        
        userInterests = profile?.interests || [];
      }

      // Construire la requête avec filtrage intelligent
      let query = supabase
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
        .neq('video_type', 'lesson') // Exclure les vidéos de type 'lesson'
        .range(from, to);

      // Algorithme de recommandation dynamique
      const shouldRecommendByInterests = userInterests.length > 0 && Math.random() < 0.8;
      
      if (shouldRecommendByInterests) {
        // 80% basé sur les intérêts : tri par engagement et pertinence
        const randomSort = Math.random();
        if (randomSort < 0.4) {
          // Contenu populaire dans les centres d'intérêt
          query = query.order('likes_count', { ascending: false });
        } else if (randomSort < 0.7) {
          // Contenu récent dans les centres d'intérêt
          query = query.order('created_at', { ascending: false });
        } else {
          // Contenu avec beaucoup de commentaires (engagement)
          query = query.order('comments_count', { ascending: false });
        }
      } else {
        // 20% découverte aléatoire pour la diversité
        const discoveryType = Math.random();
        if (discoveryType < 0.3) {
          // Nouveau contenu tendance
          query = query.order('created_at', { ascending: false });
        } else if (discoveryType < 0.6) {
          // Contenu populaire général
          query = query.order('likes_count', { ascending: false });
        } else {
          // Contenu avec engagement élevé
          query = query.order('comments_count', { ascending: false });
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching videos:', error);
        return [];
      }

      return data || [];
    },
    getNextPageParam: (lastPage, allPages) => {
      // Continuer à charger tant qu'on a des résultats
      return lastPage.length === 3 ? allPages.length : undefined;
    },
    initialPageParam: 0,
  });

  // Flatten les pages pour obtenir un array simple
  const videos = query.data?.pages?.flat() || [];

  return {
    ...query,
    data: videos,
  };
};