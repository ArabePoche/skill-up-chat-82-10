
import React, { useState, useRef, useCallback, useEffect, createContext, useContext, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import VideoCard from '@/components/video/VideoCard';
import { useInfiniteVideos } from '@/hooks/useInfiniteVideos';
import { useVideoById } from '@/hooks/useVideoById';
import ConfettiAnimation from '@/components/ConfettiAnimation';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

// Contexte global pour le contrôle du son - SON ACTIVÉ PAR DÉFAUT
const GlobalSoundContext = createContext<{
  isMuted: boolean;
  toggleMute: () => void;
}>({
  isMuted: false, // Son activé par défaut
  toggleMute: () => {}
});

export const useGlobalSound = () => useContext(GlobalSoundContext);

const TikTokVideosView: React.FC<{ targetVideoId?: string }> = ({ targetVideoId }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: videos = [], fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useInfiniteVideos();
  const { data: targetVideo } = useVideoById(targetVideoId);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [globalMuted, setGlobalMuted] = useState(false); // Son activé par défaut
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasScrolledRef = useRef(false);

  // Fusionner la vidéo cible avec le flux si elle n'est pas déjà présente
  const displayedVideos = useMemo(() => {
    if (!targetVideoId || !targetVideo) return videos;
    
    // Vérifier si la vidéo cible est déjà dans le flux
    const isInFlow = videos.some(v => v.id === targetVideoId);
    if (isInFlow) return videos;
    
    // Insérer la vidéo cible au début du flux
    return [targetVideo, ...videos];
  }, [targetVideoId, targetVideo, videos]);

  // Contrôle global du son
  const toggleGlobalMute = () => {
    setGlobalMuted(!globalMuted);
  };

  // Détecter le scroll pour changer l'URL de /video/:id vers /video
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Si on est sur /video/:id ou /videos/:id et qu'on commence à scroller
      if ((location.pathname.startsWith('/video/') || location.pathname.startsWith('/videos/')) && !hasScrolledRef.current) {
        hasScrolledRef.current = true;
        navigate('/video', { replace: true });
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [location.pathname, navigate]);

  // Réinitialiser le flag de scroll quand on arrive sur une nouvelle vidéo via lien
  useEffect(() => {
    if (location.pathname.startsWith('/video/') || location.pathname.startsWith('/videos/')) {
      hasScrolledRef.current = false;
    }
  }, [location.pathname]);

  // Intersection Observer pour la lecture automatique
  useEffect(() => {
    if (!displayedVideos || displayedVideos.length === 0) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const videoIndex = parseInt(entry.target.getAttribute('data-video-index') || '0');
          if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
            setCurrentVideoIndex(videoIndex);
          }
        });
      },
      { threshold: 0.7 }
    );

    videoRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [displayedVideos]);

  // Charger plus de vidéos quand on approche de la fin
  useEffect(() => {
    if (!displayedVideos || displayedVideos.length === 0) return;
    
    if (currentVideoIndex >= displayedVideos.length - 2 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [currentVideoIndex, displayedVideos, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (!targetVideoId || !displayedVideos || displayedVideos.length === 0) return;
    const index = displayedVideos.findIndex((v: any) => v.id === targetVideoId);
    if (index >= 0) {
      setCurrentVideoIndex(index);
      const ref = videoRefs.current[index];
      if (ref) {
        ref.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }
  }, [targetVideoId, displayedVideos]);

  const handleLikeWithConfetti = () => {
    setShowConfetti(true);
    // Ne pas refetch pour éviter de perdre la position
  };

  const handleCommentAdded = () => {
    // Ne pas refetch pour éviter de perdre la position
    // Les compteurs de commentaires seront mis à jour localement par le hook
  };

  if (!displayedVideos || displayedVideos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-white bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <GlobalSoundContext.Provider value={{ isMuted: globalMuted, toggleMute: toggleGlobalMute }}>
      <div 
        ref={containerRef}
        className="relative h-full w-full bg-black overflow-y-auto snap-y snap-mandatory"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none'
        }}
      >
        <style dangerouslySetInnerHTML={{
          __html: `
            div::-webkit-scrollbar {
              display: none;
            }
          `
        }} />
        
        {/* Contrôle global du son */}
        <div className="fixed top-4 left-4 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleGlobalMute}
            className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 border border-white/20"
          >
            {globalMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </Button>
        </div>
        
        {/* Affichage de toutes les vidéos avec scroll fluide */}
        {displayedVideos.map((video, index) => (
          <div
            key={video.id}
            ref={(el) => (videoRefs.current[index] = el)}
            data-video-index={index}
            className="relative h-screen w-full snap-start snap-always flex-shrink-0"
          >
            <VideoCard
              video={video}
              isActive={index === currentVideoIndex}
              onLikeWithConfetti={handleLikeWithConfetti}
              onCommentAdded={handleCommentAdded}
            />
          </div>
        ))}

        {/* Chargement des vidéos suivantes */}
        {isFetchingNextPage && (
          <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-black/50 backdrop-blur-sm rounded-full p-3 border border-white/20">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          </div>
        )}

        {/* Animation confetti */}
        <ConfettiAnimation
          isActive={showConfetti}
          onComplete={() => setShowConfetti(false)}
        />
      </div>
    </GlobalSoundContext.Provider>
  );
};

export default TikTokVideosView;