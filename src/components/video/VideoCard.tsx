
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, ShoppingCart } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import VideoActions from '@/components/VideoActions';
import VideoComment from '@/components/VideoComment';
import EnhancedVideoPlayer from '@/components/video/EnhancedVideoPlayer';
import { useNavigate } from 'react-router-dom';

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

interface VideoCardProps {
  video: Video;
  isActive: boolean;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, isActive }) => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (isActive) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [isActive]);

  const handleVideoClick = () => {
    setIsPlaying(prev => !prev);
  };

  const handlePromoButtonClick = (formationId: string) => {
    navigate(`/formation/${formationId}`);
  };

  const handleCommentClick = () => {
    setShowComments(prev => !prev);
  };

  const handleShareClick = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Regardez cette vidéo',
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="relative h-screen w-full flex items-center justify-center bg-black">
      {/* Vidéo principale */}
      <div 
        onClick={handleVideoClick} 
        className="relative h-full w-auto max-w-full cursor-pointer"
      >
        <EnhancedVideoPlayer
          src={video.video_url}
          poster={video.thumbnail_url}
          className="h-full w-full object-cover"
          autoPlay={isPlaying}
          muted={true}
          loop={true}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>

      {/* Informations vidéo - bas gauche */}
      <div className="absolute bottom-32 left-4 right-20 z-10 max-w-xs sm:max-w-sm">
        <div className="flex items-center space-x-3 mb-3">
          <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-white">
            <AvatarImage src={video.profiles?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
              {video.profiles?.first_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-semibold text-sm sm:text-base">
              {video.profiles?.first_name || 'Utilisateur'}
            </p>
            <p className="text-white/80 text-xs sm:text-sm">@{video.profiles?.username || 'user'}</p>
          </div>
        </div>
        
        <p className="text-white text-sm sm:text-base mb-2 leading-relaxed line-clamp-3">
          {video.description}
        </p>
        
        <p className="text-white/80 text-xs sm:text-sm">
          #{video.title}
        </p>

        {/* Bouton promo pour les vidéos de type 'promo' */}
        {video.video_type === 'promo' && video.formation_id && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handlePromoButtonClick(video.formation_id!);
            }}
            size="sm"
            className="mt-3 mb-4 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-2 px-4 rounded-full flex items-center space-x-2 text-xs sm:text-sm z-50"
          >
            <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Découvrir</span>
          </Button>
        )}
      </div>

      {/* Actions vidéo - droite */}
      <div className="absolute right-2 sm:right-4 bottom-32 z-20">
        <VideoActions
          video={video}
          onCommentClick={handleCommentClick}
          onShareClick={handleShareClick}
        />
      </div>

      {/* Commentaires intégrés */}
      {showComments && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-4 max-h-64 overflow-y-auto z-30">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold">Commentaires</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(false)}
              className="text-white hover:bg-white/10"
            >
              ×
            </Button>
          </div>
          {/* Placeholder pour les commentaires - à connecter avec la base de données */}
          <div className="space-y-3">
            <p className="text-white/70 text-sm">Aucun commentaire pour le moment</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCard;
