import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, ShoppingCart, Volume2, VolumeX, Heart, MessageCircle, Share, Bookmark, Plus } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EnhancedVideoPlayer from '@/components/video/EnhancedVideoPlayer';
import { useNavigate } from 'react-router-dom';
import { useVideoLikes } from '@/hooks/useVideoLikes';
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
  const [showComments, setShowComments] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const { isLiked, likesCount, toggleLike, isLoading } = useVideoLikes(video.id, video.likes_count);

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
      toast.success('Lien copié !');
    }
  };

  const handleLike = () => {
    toggleLike();
    if (!isLiked) {
      onLikeWithConfetti?.();
    }
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast.success(isSaved ? 'Vidéo retirée des favoris' : 'Vidéo ajoutée aux favoris');
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    toast.success(isFollowing ? 'Désabonné' : 'Abonné !');
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatCount = (count: number) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return (count / 1000).toFixed(1) + 'K';
    return (count / 1000000).toFixed(1) + 'M';
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

      {/* Actions vidéo - droite avec profil utilisateur */}
      <div className="absolute right-2 sm:right-4 bottom-32 z-20 flex flex-col items-center space-y-4">
        {/* Profil de l'auteur */}
        <div className="flex flex-col items-center mb-2">
          <Avatar className="w-12 h-12 border-2 border-white mb-2">
            <AvatarImage src={video.profiles?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
              {video.profiles?.first_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleFollow();
            }}
            size="sm"
            className={`w-6 h-6 rounded-full text-xs font-bold ${
              isFollowing 
                ? 'bg-gray-500 text-white' 
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            {isFollowing ? '✓' : '+'}
          </Button>
        </div>

        {/* Actions vidéo */}
        <div className="flex flex-col items-center space-y-4">
          {/* Like */}
          <div className="flex flex-col items-center">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleLike();
              }}
              disabled={isLoading}
              variant="ghost"
              size="sm"
              className={`w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-all duration-200 ${
                isLiked ? 'text-red-500' : ''
              }`}
            >
              <Heart size={20} className={isLiked ? 'fill-current' : ''} />
            </Button>
            <span className="text-white text-xs mt-1 font-medium">
              {formatCount(likesCount)}
            </span>
          </div>

          {/* Comment */}
          <div className="flex flex-col items-center">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleCommentClick();
              }}
              variant="ghost"
              size="sm"
              className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-all duration-200"
            >
              <MessageCircle size={20} />
            </Button>
            <span className="text-white text-xs mt-1 font-medium">
              {formatCount(video.comments_count)}
            </span>
          </div>

          {/* Share */}
          <div className="flex flex-col items-center">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleShareClick();
              }}
              variant="ghost"
              size="sm"
              className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-all duration-200"
            >
              <Share size={20} />
            </Button>
            <span className="text-white text-xs mt-1 font-medium">
              Partager
            </span>
          </div>

          {/* Save */}
          <div className="flex flex-col items-center">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              variant="ghost"
              size="sm"
              className={`w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-all duration-200 ${
                isSaved ? 'text-yellow-500' : ''
              }`}
            >
              <Bookmark size={20} className={isSaved ? 'fill-current' : ''} />
            </Button>
            <span className="text-white text-xs mt-1 font-medium">
              {isSaved ? 'Sauvé' : 'Sauver'}
            </span>
          </div>
        </div>
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