
import React, { useState, useRef, useCallback, useEffect } from 'react';
import VideoCard from '@/components/video/VideoCard';
import { useInfiniteVideos } from '@/hooks/useInfiniteVideos';

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

const TikTokVideosView: React.FC = () => {
  const { data: videos, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteVideos();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const touchEndY = useRef<number>(0);

  // Défilement avec la molette
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const direction = e.deltaY > 0 ? 1 : -1;
    
    if (direction > 0 && currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(prev => prev + 1);
    } else if (direction < 0 && currentVideoIndex > 0) {
      setCurrentVideoIndex(prev => prev - 1);
    }

    // Charger plus de vidéos si on approche de la fin
    if (direction > 0 && currentVideoIndex >= videos.length - 2 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [currentVideoIndex, videos.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Gestion tactile pour mobile
  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    touchEndY.current = e.changedTouches[0].clientY;
    const deltaY = touchStartY.current - touchEndY.current;
    
    // Seuil minimum pour déclencher le changement
    if (Math.abs(deltaY) > 50) {
      if (deltaY > 0 && currentVideoIndex < videos.length - 1) {
        // Scroll vers le bas
        setCurrentVideoIndex(prev => prev + 1);
      } else if (deltaY < 0 && currentVideoIndex > 0) {
        // Scroll vers le haut
        setCurrentVideoIndex(prev => prev - 1);
      }

      // Charger plus de vidéos si nécessaire
      if (deltaY > 0 && currentVideoIndex >= videos.length - 2 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  }, [currentVideoIndex, videos.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
      
      return () => {
        container.removeEventListener('wheel', handleWheel);
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [handleWheel, handleTouchStart, handleTouchEnd]);

  if (!videos.length) {
    return (
      <div className="h-full flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full bg-black overflow-hidden"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {/* Vidéo courante */}
      <div className="h-full w-full">
        {videos[currentVideoIndex] && (
          <VideoCard
            video={videos[currentVideoIndex]}
            isActive={true}
          />
        )}
      </div>

      {/* Indicateurs de navigation - simplifié */}
      <div className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 flex flex-col space-y-1 z-20">
        {videos.slice(Math.max(0, currentVideoIndex - 2), currentVideoIndex + 3).map((_, index) => {
          const actualIndex = Math.max(0, currentVideoIndex - 2) + index;
          return (
            <div
              key={actualIndex}
              className={`w-1 h-6 sm:h-8 rounded-full transition-all duration-300 ${
                actualIndex === currentVideoIndex ? 'bg-white' : 'bg-white/30'
              }`}
            />
          );
        })}
      </div>

      {/* Chargement des vidéos suivantes */}
      {isFetchingNextPage && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-black/50 rounded-full p-2 sm:p-3">
            <div className="animate-spin rounded-full h-4 w-4 sm:h-6 sm:w-6 border-b-2 border-white"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TikTokVideosView;
