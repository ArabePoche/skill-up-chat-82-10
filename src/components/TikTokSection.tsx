
import React, { useState, useRef } from 'react';
import { Heart, MessageCircle, Share, MoreHorizontal, Play, Pause } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useVideos } from '@/hooks/useVideos';

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  likes_count: number;
  comments_count: number;
  author_id: string;
  products?: {
    id: string;
    title: string;
    price: number;
  };
  profiles?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

interface TikTokSectionProps {
  videos?: Video[];
  onEnroll?: (formationId: string) => Promise<void>;
}

const TikTokSection: React.FC<TikTokSectionProps> = ({ videos: propVideos, onEnroll }) => {
  const { data: fetchedVideos = [], isLoading } = useVideos();
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});

  // Use prop videos if provided, otherwise use fetched videos
  const videos = propVideos || fetchedVideos;

  const handlePlayPause = (videoId: string) => {
    const video = videoRefs.current[videoId];
    if (!video) return;

    if (playingVideo === videoId) {
      video.pause();
      setPlayingVideo(null);
    } else {
      // Pause other videos
      Object.values(videoRefs.current).forEach(v => v.pause());
      video.play();
      setPlayingVideo(videoId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {videos.map((video) => (
        <div key={video.id} className="relative bg-black rounded-lg overflow-hidden aspect-[9/16] max-h-[600px]">
          {/* Video Element */}
          <video
            ref={(el) => {
              if (el) videoRefs.current[video.id] = el;
            }}
            className="w-full h-full object-cover"
            src={video.video_url || ''}
            poster={video.thumbnail_url || ''}
            loop
            muted
            playsInline
          />

          {/* Play/Pause Overlay */}
          <div 
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={() => handlePlayPause(video.id)}
          >
            {playingVideo !== video.id && (
              <div className="bg-black/50 rounded-full p-4">
                <Play className="w-8 h-8 text-white" />
              </div>
            )}
          </div>

          {/* Content Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex items-end justify-between">
              {/* Left side - User info and description */}
              <div className="flex-1 text-white">
                <div className="flex items-center space-x-3 mb-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={video.profiles?.avatar_url} />
                    <AvatarFallback>
                      {video.profiles?.first_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold">
                    {video.profiles?.first_name || 'Utilisateur'}
                  </span>
                </div>
                <p className="text-sm mb-2 line-clamp-2">{video.description}</p>
                <p className="text-xs text-gray-300">#{video.title}</p>
              </div>

              {/* Right side - Action buttons */}
              <div className="flex flex-col items-center space-y-4 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 flex flex-col items-center"
                >
                  <Heart className="w-6 h-6 mb-1" />
                  <span className="text-xs">{video.likes_count || 0}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 flex flex-col items-center"
                >
                  <MessageCircle className="w-6 h-6 mb-1" />
                  <span className="text-xs">{video.comments_count || 0}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 flex flex-col items-center"
                >
                  <Share className="w-6 h-6 mb-1" />
                  <span className="text-xs">Partager</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <MoreHorizontal className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TikTokSection;
