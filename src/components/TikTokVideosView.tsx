
import React, { useState, useRef, useEffect, createContext, useContext, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import VideoCard from '@/components/video/VideoCard';
import { useInfiniteVideos } from '@/hooks/useInfiniteVideos';
import { useVideoById } from '@/hooks/useVideoById';
import ConfettiAnimation from '@/components/ConfettiAnimation';
import { Button } from '@/components/ui/button';
import LiveRailButton from '@/components/live/LiveRailButton';
import LiveFeedView, { useLiveFeed } from '@/components/live/LiveFeedView';

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
  isMuted: false,
  toggleMute: () => {}
});

export const useGlobalSound = () => useContext(GlobalSoundContext);

const SOUND_PREFERENCE_KEY = 'tiktok-feed-muted';

const TikTokVideosView: React.FC<{
  targetVideoId?: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}> = ({ targetVideoId, scrollContainerRef }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    data: videos = [],
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingVideos,
    isError: isVideosError,
    refetch: refetchVideos,
    error: videosError,
  } = useInfiniteVideos();
  const {
    data: targetVideo,
    isLoading: isLoadingTargetVideo,
    isError: isTargetVideoError,
    refetch: refetchTargetVideo,
    error: targetVideoError,
  } = useVideoById(targetVideoId);

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const hasInitializedTarget = useRef(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isLiveFeedOpen, setIsLiveFeedOpen] = useState(false);
  const [globalMuted, setGlobalMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SOUND_PREFERENCE_KEY) === 'true';
  });
  const videoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const visibleRatiosRef = useRef<Map<number, number>>(new Map());

  // Hook centralisé pour les lives
  const { liveStreams, isLoadingLives, livesError, retryLoadingLives } = useLiveFeed();

  useEffect(() => {
    hasInitializedTarget.current = false;
  }, [targetVideoId]);

  const displayedVideos = useMemo(() => {
    if (!targetVideoId || !targetVideo) return videos;
    const isInFlow = videos.some(v => v.id === targetVideoId);
    if (isInFlow) return videos;
    return [targetVideo, ...videos];
  }, [targetVideoId, targetVideo, videos]);

  const toggleGlobalMute = () => setGlobalMuted((prev) => !prev);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SOUND_PREFERENCE_KEY, String(globalMuted));
  }, [globalMuted]);

  useEffect(() => {
    if (!location.pathname.startsWith('/video/') && !location.pathname.startsWith('/videos/')) return;
    if (targetVideoId) {
      if (isLoadingTargetVideo || !hasInitializedTarget.current) return;
    }
    const currentVideo = displayedVideos[currentVideoIndex];
    if (!currentVideo) return;
    const pathPrefix = location.pathname.startsWith('/videos/') ? '/videos' : '/video';
    const expectedPath = `${pathPrefix}/${currentVideo.id}`;
    if (location.pathname !== expectedPath) navigate(expectedPath, { replace: true });
  }, [currentVideoIndex, displayedVideos, isLoadingTargetVideo, location.pathname, navigate, targetVideoId]);

  const videosLength = displayedVideos?.length ?? 0;
  useEffect(() => {
    if (videosLength === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const videoIndex = parseInt(entry.target.getAttribute('data-video-index') || '0', 10);
          visibleRatiosRef.current.set(videoIndex, entry.intersectionRatio);
        });
        let bestIndex = currentVideoIndex;
        let bestRatio = 0;
        entries.forEach((entry) => {
          const videoIndex = parseInt(entry.target.getAttribute('data-video-index') || '0', 10);
          const ratio = visibleRatiosRef.current.get(videoIndex) || 0;
          if (entry.isIntersecting && ratio >= bestRatio && ratio >= 0.55) {
            bestRatio = ratio;
            bestIndex = videoIndex;
          }
        });
        if (bestIndex !== currentVideoIndex) setCurrentVideoIndex(bestIndex);
      },
      { root: scrollContainerRef?.current || null, threshold: [0.25, 0.55, 0.8] }
    );
    videoRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    return () => { visibleRatiosRef.current.clear(); observer.disconnect(); };
  }, [currentVideoIndex, videosLength, scrollContainerRef]);

  useEffect(() => {
    if (!displayedVideos || displayedVideos.length === 0) return;
    if (currentVideoIndex >= displayedVideos.length - 2 && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [currentVideoIndex, displayedVideos, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (!targetVideoId || !displayedVideos || displayedVideos.length === 0) return;
    if (hasInitializedTarget.current) return;
    const index = displayedVideos.findIndex((v: any) => v.id === targetVideoId);
    if (index >= 0) {
      hasInitializedTarget.current = true;
      setCurrentVideoIndex(index);
      requestAnimationFrame(() => {
        const ref = videoRefs.current[index];
        if (ref) ref.scrollIntoView({ behavior: 'auto', block: 'start' });
      });
    }
  }, [targetVideoId, displayedVideos]);

  const handleLikeWithConfetti = () => setShowConfetti(true);
  const handleCommentAdded = () => {};

  const retryLoading = () => {
    refetchVideos();
    if (targetVideoId) refetchTargetVideo();
  };

  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const shouldShowInitialSpinner = (isLoadingVideos && videos.length === 0) || (targetVideoId && isLoadingTargetVideo);
  const shouldShowErrorState = (videos.length === 0 && isVideosError) || (targetVideoId && isTargetVideoError);
  const errorMessage = isOffline ? "La connexion semble indisponible. Vérifie Internet puis réessaie." : "Impossible de charger le flux vidéo pour le moment.";

  if (shouldShowInitialSpinner) {
    return (
      <div className="h-full flex items-center justify-center text-white bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (shouldShowErrorState) {
    return (
      <div className="h-full flex items-center justify-center bg-black px-6 text-white">
        <div className="max-w-sm text-center">
          <h2 className="text-lg font-semibold">Chargement interrompu</h2>
          <p className="mt-2 text-sm text-white/70">{errorMessage}</p>
          <Button onClick={retryLoading} className="mt-4 bg-white text-black hover:bg-white/90">Réessayer</Button>
        </div>
      </div>
    );
  }

  if (targetVideoId && !isLoadingTargetVideo && !targetVideo && displayedVideos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-black px-6 text-white">
        <div className="max-w-sm text-center">
          <h2 className="text-lg font-semibold">Vidéo introuvable</h2>
          <p className="mt-2 text-sm text-white/70">Cette vidéo n'est plus disponible ou a été retirée.</p>
          <Button onClick={() => navigate('/video', { replace: true })} className="mt-4 bg-white text-black hover:bg-white/90">Retour au flux</Button>
        </div>
      </div>
    );
  }

  if (!displayedVideos || displayedVideos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-black px-6 text-white">
        <div className="max-w-sm text-center">
          <h2 className="text-lg font-semibold">Aucune vidéo disponible</h2>
          <p className="mt-2 text-sm text-white/70">Le flux est vide pour le moment. Reviens un peu plus tard.</p>
        </div>
      </div>
    );
  }

  return (
    <GlobalSoundContext.Provider value={{ isMuted: globalMuted, toggleMute: toggleGlobalMute }}>
      <div className="tiktok-feed relative h-full w-full bg-black">

        {/* Bouton Live en haut à gauche */}
        <div className="fixed top-4 left-4 z-50 relative">
          <LiveRailButton
            isOpen={isLiveFeedOpen}
            liveCount={liveStreams.length}
            onToggle={() => setIsLiveFeedOpen((c) => !c)}
          />
        </div>

        {isLiveFeedOpen ? (
          <LiveFeedView
            liveStreams={liveStreams}
            isLoadingLives={isLoadingLives}
            livesError={livesError}
            retryLoadingLives={retryLoadingLives}
          />
        ) : (
          <>
            {displayedVideos.map((video, index) => {
              const uniqueKey = `${video.id}-${index}`;
              const shouldRender = Math.abs(index - currentVideoIndex) <= 2;
              return (
                <div
                  key={uniqueKey}
                  ref={(el) => (videoRefs.current[index] = el)}
                  data-video-index={index}
                  className="relative h-screen w-full snap-start snap-always flex-shrink-0"
                >
                  {shouldRender ? (
                    <VideoCard
                      video={video}
                      isActive={index === currentVideoIndex}
                      onLikeWithConfetti={handleLikeWithConfetti}
                      onCommentAdded={handleCommentAdded}
                    />
                  ) : (
                    <div className="w-full h-full relative bg-black overflow-hidden">
                      {video.thumbnail_url && (
                        <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover opacity-20 blur-md pointer-events-none" loading="lazy" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {isFetchingNextPage && (
              <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-50">
                <div className="bg-black/50 backdrop-blur-sm rounded-full p-3 border border-white/20">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              </div>
            )}
          </>
        )}

        <ConfettiAnimation isActive={showConfetti} onComplete={() => setShowConfetti(false)} />
      </div>
    </GlobalSoundContext.Provider>
  );
};

export default TikTokVideosView;
