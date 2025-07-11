
import React, { useState, useRef, useCallback, useEffect } from 'react';
import VideoCard from '@/components/video/VideoCard';
import { useInfiniteVideos } from '@/hooks/useInfiniteVideos';
import ConfettiAnimation from '@/components/ConfettiAnimation';

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
  const [showConfetti, setShowConfetti] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Intersection Observer pour la lecture automatique
  useEffect(() => {
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
  }, [videos.length]);

  // Charger plus de vidéos quand on approche de la fin
  useEffect(() => {
    if (currentVideoIndex >= videos.length - 2 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [currentVideoIndex, videos.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleLikeWithConfetti = () => {
    setShowConfetti(true);
  };

  if (!videos.length) {
    return (
      <div className="h-full flex items-center justify-center text-white bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full bg-black overflow-y-auto snap-y snap-mandatory"
      style={{ 
        scrollbarWidth: 'none', 
        msOverflowStyle: 'none'
      }}
    >
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      {/* Affichage de toutes les vidéos avec scroll fluide */}
      {videos.map((video, index) => (
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
  );
};

export default TikTokVideosView;
