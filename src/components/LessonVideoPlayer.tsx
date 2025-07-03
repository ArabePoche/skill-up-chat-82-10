
import React from 'react';

interface LessonVideoPlayerProps {
  url: string;
  className?: string;
}

const LessonVideoPlayer: React.FC<LessonVideoPlayerProps> = ({ url, className = "" }) => {
  if (!url) {
    return (
      <div className="w-full aspect-video bg-gray-100 flex items-center justify-center rounded-lg">
        <p className="text-gray-500">Aucune vidéo disponible</p>
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
        <div className={`w-full aspect-video ${className}`}>
          <iframe
            src={embedUrl}
            title="Vidéo de la leçon"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full rounded-lg"
          />
        </div>
      );
    }
  }

  // Pour les autres types de vidéos (MP4, etc.)
  return (
    <div className={`w-full aspect-video ${className}`}>
      <video
        src={url}
        controls
        className="w-full h-full rounded-lg bg-black"
        preload="metadata"
      >
        <p className="text-gray-500">
          Votre navigateur ne supporte pas la lecture de cette vidéo.
        </p>
      </video>
    </div>
  );
};

export default LessonVideoPlayer;
