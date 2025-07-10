// Composant vidéo enrichi : gère les vidéos YouTube, Vimeo et fichiers MP4
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

// Définition des props du composant
interface EnhancedVideoPlayerProps {
  src: string; // URL de la vidéo (YouTube, Vimeo ou MP4)
  poster?: string; // Image d'aperçu pour les vidéos MP4
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
  // Référence pour la balise <video> (MP4)
  const videoRef = useRef<HTMLVideoElement>(null);
  // États pour le contrôle du lecteur
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [showControls, setShowControls] = useState(false);
  // Détection du type de vidéo et extraction de l'ID si besoin
  const [videoType, setVideoType] = useState<'youtube' | 'vimeo' | 'mp4' | 'unknown'>('unknown');
  const [embedId, setEmbedId] = useState('');

  useEffect(() => {
    // Détection du type de vidéo à partir de l'URL
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const vimeoRegex = /(?:vimeo\.com\/)(?:.*\/)?(\d+)/;
    const mp4Regex = /\.(mp4|webm|ogg)(\?.*)?$/i;

    const youtubeMatch = src.match(youtubeRegex);
    const vimeoMatch = src.match(vimeoRegex);
    const isMp4 = mp4Regex.test(src);

    if (youtubeMatch) {
      setVideoType('youtube');
      setEmbedId(youtubeMatch[1]);
    } else if (vimeoMatch) {
      setVideoType('vimeo');
      setEmbedId(vimeoMatch[1]);
    } else if (isMp4) {
      setVideoType('mp4');
      setEmbedId('');
    } else {
      setVideoType('unknown');
      setEmbedId('');
    }
  }, [src]);

  // Synchronisation du mute et de l'autoplay pour les vidéos MP4
  useEffect(() => {
    if (videoRef.current && videoType === 'mp4') {
      videoRef.current.muted = isMuted;
      if (autoPlay) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          onPlay?.();
        }).catch(() => {});
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
        onPause?.();
      }
    }
  }, [autoPlay, isMuted, onPlay, onPause, videoType]);

  // Gestion du bouton play/pause pour MP4
  const togglePlay = () => {
    if (videoType !== 'mp4' || !videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      onPause?.();
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        onPlay?.();
      }).catch(() => {});
    }
  };

  // Gestion du mute pour MP4
  const toggleMute = () => {
    if (videoType !== 'mp4' || !videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Plein écran pour MP4
  const toggleFullscreen = () => {
    if (videoType !== 'mp4' || !videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  // Rendu pour YouTube
  if (videoType === 'youtube') {
    return (
      <div className={`relative ${className}`}>{/* Lecteur YouTube intégré */}
        <iframe
          src={`https://www.youtube.com/embed/${embedId}?autoplay=${autoPlay ? 1 : 0}&mute=${muted ? 1 : 0}&loop=${loop ? 1 : 0}&controls=1&showinfo=0&rel=0&modestbranding=1&playlist=${embedId}`}
          className="w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video player"
        />
      </div>
    );
  }

  // Rendu pour Vimeo
  if (videoType === 'vimeo') {
    return (
      <div className={`relative ${className}`}>{/* Lecteur Vimeo intégré */}
        <iframe
          src={`https://player.vimeo.com/video/${embedId}?autoplay=${autoPlay ? 1 : 0}&muted=${muted ? 1 : 0}&loop=${loop ? 1 : 0}`}
          className="w-full h-full"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="Vimeo video player"
        />
      </div>
    );
  }

  // Rendu pour MP4 et autres fichiers vidéo
  if (videoType === 'mp4') {
    return (
      <div 
        className={`relative group ${className}`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Balise vidéo HTML5 */}
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

        {/* Overlay de contrôles personnalisés */}
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
  }

  // Cas inconnu : on affiche un message d'erreur
  return (
    <div className={`relative ${className}`}>Type de vidéo non supporté ou URL invalide.</div>
  );
};

export default EnhancedVideoPlayer;