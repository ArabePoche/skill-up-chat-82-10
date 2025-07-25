import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

interface EnhancedVideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
}

const EnhancedVideoPlayer: React.FC<EnhancedVideoPlayerProps> = ({
  src,
  poster,
  className = "",
  autoPlay = false,
  muted = true,
  loop = true,
  onPlay,
  onPause
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [showControls, setShowControls] = useState(false);
  const [isYouTube, setIsYouTube] = useState(false);
  const [youtubeId, setYoutubeId] = useState('');

  useEffect(() => {
    // Détection des vidéos YouTube
    const ytRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = src.match(ytRegex);
    
    if (match) {
      setIsYouTube(true);
      setYoutubeId(match[1]);
    }
  }, [src]);

  useEffect(() => {
    if (videoRef.current && !isYouTube) {
      // Synchroniser le mute state avec le prop
      videoRef.current.muted = isMuted;
      
      if (autoPlay) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          onPlay?.();
        }).catch(console.error);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
        onPause?.();
      }
    }
  }, [autoPlay, isMuted, onPlay, onPause, isYouTube]);

  const togglePlay = () => {
    if (!videoRef.current && !isYouTube) return;

    if (isYouTube) {
      // Pour YouTube, on utilise l'iframe API (à implémenter si nécessaire)
      return;
    }

    if (isPlaying) {
      videoRef.current?.pause();
      setIsPlaying(false);
      onPause?.();
    } else {
      videoRef.current?.play().then(() => {
        setIsPlaying(true);
        onPlay?.();
      }).catch(console.error);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  if (isYouTube) {
    return (
      <div className={`relative ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=${autoPlay ? 1 : 0}&mute=${muted ? 1 : 0}&loop=${loop ? 1 : 0}&controls=0&showinfo=0&rel=0&modestbranding=1&playlist=${youtubeId}`}
          className="w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div 
      className={`relative group ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-cover"
        muted={isMuted}
        loop={loop}
        playsInline
        onPlay={() => {
          setIsPlaying(true);
          onPlay?.();
        }}
        onPause={() => {
          setIsPlaying(false);
          onPause?.();
        }}
      />

      {/* Overlay de contrôles */}
      <div className={`absolute inset-0 bg-black bg-opacity-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Bouton play/pause central */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="bg-black bg-opacity-50 rounded-full p-4 text-white hover:bg-opacity-70 transition-all"
          >
            {isPlaying ? <Pause size={32} /> : <Play size={32} />}
          </button>
        </div>

        {/* Contrôles en bas */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={togglePlay}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            
            <button
              onClick={toggleMute}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="text-white hover:text-gray-300 transition-colors"
          >
            <Maximize size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedVideoPlayer;