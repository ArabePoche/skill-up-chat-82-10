
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, ShoppingCart, Volume2, VolumeX } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EnhancedVideoPlayer from '@/components/video/EnhancedVideoPlayer';
import VideoUserProfile from './VideoUserProfile';
import VideoLike from './VideoLike';
import VideoFavoris from './VideoFavoris';
import VideoComment from './VideoComment';
import VideoCommentsModal from './VideoCommentsModal';
import { Share } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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
  onLikeWithConfetti?: () => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, isActive, onLikeWithConfetti }) => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);

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
    setShowCommentsModal(true);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: 'Regardez cette vidéo',
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Lien copié !');
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <>
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
            muted={isMuted}
            loop={true}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          
          {/* Badge Formation pour les vidéos promo */}
          {video.video_type === 'promo' && (
            <Badge className="absolute top-4 left-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold px-3 py-1 z-20">
              🎓 Formation
            </Badge>
          )}

          {/* Contrôle audio en haut à droite */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 z-20"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </Button>
        </div>

        {/* Informations vidéo - bas gauche */}
        <div className="absolute bottom-32 left-4 right-20 z-10 max-w-xs sm:max-w-sm">
          <p className="text-white text-sm sm:text-base mb-2 leading-relaxed line-clamp-3">
            {video.description}
          </p>
          
          <p className="text-white/80 text-xs sm:text-sm">
            #{video.title}
          </p>

          {/* Boutons pour les vidéos de type 'promo' */}
          {video.video_type === 'promo' && video.formation_id && (
            <div className="flex flex-col space-y-2 mt-3">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePromoButtonClick(video.formation_id!);
                }}
                size="sm"
                className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-2 px-4 rounded-full flex items-center space-x-2 text-xs sm:text-sm z-50"
              >
                <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Découvrir</span>
              </Button>
              
              {video.price && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePromoButtonClick(video.formation_id!);
                  }}
                  size="sm"
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-2 px-4 rounded-full flex items-center space-x-2 text-xs sm:text-sm z-50"
                >
                  <span>💰 Acheter {video.price}€/mois</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Actions vidéo - droite */}
        <div className="absolute right-2 sm:right-4 bottom-32 z-20 flex flex-col items-center space-y-4">
          {/* Avatar avec bouton + */}
          <VideoUserProfile 
            profile={video.profiles} 
            showFollowButton={true}
          />

          {/* Actions vidéo */}
          <div className="flex flex-col items-center space-y-4 z-30">
            <VideoLike 
              videoId={video.id} 
              initialLikesCount={video.likes_count}
              onLikeWithConfetti={onLikeWithConfetti}
            />
            
            <VideoComment 
              commentsCount={video.comments_count}
              onCommentClick={handleCommentClick}
            />
            
            <div className="flex flex-col items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShareClick}
                className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-all duration-200 flex items-center justify-center border border-white/20"
              >
                <Share size={20} />
              </Button>
              <span className="text-white text-xs mt-1 font-medium">
                Partager
              </span>
            </div>
            
            <VideoFavoris videoId={video.id} />
          </div>
        </div>
      </div>

      {/* Modal des commentaires */}
      <VideoCommentsModal
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        videoId={video.id}
        videoTitle={video.title}
      />
    </>
  );
};

export default VideoCard;
