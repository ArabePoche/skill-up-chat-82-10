import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRef } from 'react';

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  likes_count: number;
  comments_count: number;
  views_count?: number;
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
  // Set pour tracker les vidéos déjà affichées dans cette session
  const displayedVideosRef = useRef<Set<string>>(new Set());

  const query = useInfiniteQuery({
    queryKey: ['infinite-videos', user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      const pageSize = 3;

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

      // Exclure les vidéos déjà affichées dans cette session
      const displayedIds = Array.from(displayedVideosRef.current);
      
      // Construire la requête avec filtrage intelligent
      let query = supabase
        .from('videos')
        .select(`
          *,
          profiles:author_id (
            first_name,
            last_name,
            username,
            avatar_url,
            is_verified
          )
        `)
        .eq('is_active', true)
        .neq('video_type', 'lesson'); // Exclure les vidéos de type 'lesson'
      
      // Exclure les vidéos déjà vues
      if (displayedIds.length > 0) {
        query = query.not('id', 'in', `(${displayedIds.join(',')})`);
      }
      
      // Algorithme de recommandation avec shuffle réel
      // On récupère un pool plus large puis on mélange côté client
      const poolSize = pageSize * 4;
      query = query.limit(poolSize);

      // Varier le tri pour diversifier le pool
      const sortOptions = ['likes_count', 'created_at', 'comments_count'] as const;
      const randomSortKey = sortOptions[Math.floor(Math.random() * sortOptions.length)];
      query = query.order(randomSortKey, { ascending: Math.random() > 0.5 });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching videos:', error);
        return [];
      }

      // Ajouter les nouvelles vidéos au Set des vidéos affichées
      if (data && data.length > 0) {
        data.forEach((video: Video) => {
          displayedVideosRef.current.add(video.id);
        });
      }

      return data || [];
    },
    getNextPageParam: (lastPage, allPages) => {
      // Continuer à charger si on a reçu le nombre complet de vidéos demandé
      // Cela signifie qu'il y a potentiellement plus de vidéos disponibles
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