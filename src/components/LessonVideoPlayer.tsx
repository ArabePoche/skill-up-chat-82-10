
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Maximize2, Volume2, VolumeX, ThumbsUp, ThumbsDown, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LessonVideoPlayerProps {
  url: string;
  className?: string;
  title?: string;
  views?: string;
  channelName?: string;
}

const LessonVideoPlayer: React.FC<LessonVideoPlayerProps> = ({ 
  url, 
  className = "",
  title = "Vidéo de la leçon",
  views = "12 345 vues",
  channelName = "Formation Academy"
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!url) {
    return (
      <div className="w-full">
        <div className="w-full aspect-video bg-muted flex items-center justify-center rounded-lg">
          <p className="text-muted-foreground">Aucune vidéo disponible</p>
        </div>
        <div className="p-4 bg-background border-x border-b rounded-b-lg">
          <h3 className="font-semibold text-foreground mb-2">Aucune vidéo</h3>
          <p className="text-sm text-muted-foreground">0 vues</p>
        </div>
      </div>
    );
  }

  // Détecter si c'est une URL YouTube
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  
  if (isYouTube) {
    // Extraire l'ID de la vidéo YouTube
    let videoId = '';
    
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1]?.split('&')[0] || '';
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
    }
    
    if (videoId) {
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      
      return (
        <div className={`w-full ${className}`}>
          <div className="w-full aspect-video rounded-t-lg overflow-hidden">
            <iframe
              src={embedUrl}
              title="Vidéo de la leçon"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          <div className="p-4 bg-background border-x border-b rounded-b-lg">
            <h3 className="font-semibold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground mb-3">{views}</p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="p-2">
                  <ThumbsUp size={18} />
                </Button>
                <Button variant="ghost" size="sm" className="p-2">
                  <ThumbsDown size={18} />
                </Button>
                <Button variant="ghost" size="sm" className="p-2">
                  <Share2 size={18} />
                </Button>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground font-semibold text-sm">
                      {channelName.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{channelName}</span>
                </div>
                <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700">
                  S'ABONNER
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Gestion des événements vidéo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    
    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!isFullscreen) {
      video.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`w-full ${className}`}>
      <div 
        className="relative w-full aspect-video bg-black rounded-t-lg overflow-hidden group cursor-pointer"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={url}
          className="w-full h-full object-contain"
          preload="metadata"
        />

        {/* Bouton play central */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors">
              <Play size={24} className="text-white ml-1" fill="white" />
            </div>
          </div>
        )}

        {/* Contrôles inférieurs */}
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          {/* Barre de progression */}
          <div 
            className="w-full h-1 bg-white/30 rounded-full cursor-pointer mb-3 group/progress"
            onClick={handleProgressClick}
          >
            <div 
              className="h-full bg-red-600 rounded-full relative group-hover/progress:h-1.5 transition-all"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Contrôles */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="text-white hover:text-white hover:bg-white/20 p-2"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="text-white hover:text-white hover:bg-white/20 p-2"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </Button>

              <span className="text-sm font-medium">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="text-white hover:text-white hover:bg-white/20 p-2"
            >
              <Maximize2 size={20} />
            </Button>
          </div>
        </div>
      </div>

      {/* Informations sur la vidéo */}
      <div className="p-4 bg-background border-x border-b rounded-b-lg">
        <h3 className="font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-3">{views}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="p-2 hover:bg-muted">
              <ThumbsUp size={18} />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 hover:bg-muted">
              <ThumbsDown size={18} />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 hover:bg-muted">
              <Share2 size={18} />
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-semibold text-sm">
                  {channelName.charAt(0)}
                </span>
              </div>
              <span className="text-sm font-medium">{channelName}</span>
            </div>
            <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700 text-white">
              S'ABONNER
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonVideoPlayer;
