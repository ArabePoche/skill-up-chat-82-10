import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRef, useMemo } from 'react';

// Générer un identifiant de session unique au chargement du module
// Ainsi, le cache ('infinite-videos') sera complètement neuf à chaque F5/rechargement d'application.
const SESSION_ID = Math.random().toString(36).substring(7);

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

  // Avoir une clé unique par lancement permet d'ignorer complètement le cache persistant global
  const query = useInfiniteQuery({
    queryKey: ['infinite-videos', user?.id, SESSION_ID],
    queryFn: async ({ pageParam = 0 }) => {
      const pageSize = 3;

      // Si on demande la première page (refresh complet), on vide l'historique
      if (pageParam === 0) {
        displayedVideosRef.current.clear();
      }

      // Exclure les vidéos déjà affichées dans cette session
      const displayedIds = Array.from(displayedVideosRef.current);
      
      // 1. Déterminer combien de vidéos totales existent pour pouvoir piocher une page "au hasard"
      const { count } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .neq('video_type', 'lesson');
        
      const totalCount = count || 0;
      const poolSize = pageSize * 4;

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
      
      // 2. Créer un "offset" de départ totalement aléatoire 
      // pour que chaque requête tape au hasard dans toutes les vidéos existantes
      if (totalCount > poolSize) {
        // La plage d'offset doit prendre en compte qu'on a déjà ignoré (affiché) `displayedIds.length` vidéos
        const maxOffset = Math.max(0, totalCount - displayedIds.length - poolSize);
        const randomOffset = Math.floor(Math.random() * maxOffset);
        query = query.range(randomOffset, randomOffset + poolSize - 1);
      } else {
        query = query.limit(poolSize);
      }

      // Varier le tri même si on est sur un offset, pour assurer un maximum d'aléatoire
      const sortOptions = ['likes_count', 'created_at', 'comments_count'] as const;
      const randomSortKey = sortOptions[Math.floor(Math.random() * sortOptions.length)];
      query = query.order(randomSortKey, { ascending: Math.random() > 0.5 });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching videos:', error);
        throw error;
      }

      // Mélanger le pool aléatoirement (Fisher-Yates) puis prendre pageSize
      const shuffled = [...(data || [])];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const result = shuffled.slice(0, pageSize);

      // Ajouter les nouvelles vidéos au Set des vidéos affichées
      if (result.length > 0) {
        result.forEach((video: Video) => {
          displayedVideosRef.current.add(video.id);
        });
      }

      return result;
    },
    getNextPageParam: (lastPage, allPages) => {
      // Continuer à charger si on a reçu le nombre complet de vidéos demandé
      // Cela signifie qu'il y a potentiellement plus de vidéos disponibles
      return lastPage.length === 3 ? allPages.length : undefined;
    },
    initialPageParam: 0,
    retry: 1,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5, // 5 minutes (évite le refetch intempestif qui remplace la vidéo)
    refetchOnMount: false, // Évite de recharger si le composant remonte
    refetchOnWindowFocus: false,
  });

  // Flatten les pages pour obtenir un array simple
  const videos = query.data?.pages?.flat() || [];

  return {
    ...query,
    data: videos,
  };
};