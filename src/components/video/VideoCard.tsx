import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share, Bookmark, Play, Pause, Plus, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useVideoLikes } from '@/hooks/useVideoLikes';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import VideoCommentsModal from './VideoCommentsModal';
import VideoShareModal from './VideoShareModal';
import { useGlobalSound } from '@/components/TikTokVideosView';
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
  onCommentAdded?: () => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ 
  video, 
  isActive, 
  onLikeWithConfetti,
  onCommentAdded 
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMuted } = useGlobalSound();
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { isLiked, likesCount, toggleLike } = useVideoLikes(video.id, video.likes_count);

  // Détection du type de vidéo
  const isYouTube = video.video_url.includes('youtube.com') || video.video_url.includes('youtu.be');
  const isVimeo = video.video_url.includes('vimeo.com');
  const isMp4 = video.video_url.endsWith('.mp4') || video.video_url.includes('.mp4');

  // Extraction de l'ID YouTube
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : '';
  };

  // Extraction de l'ID Vimeo
  const getVimeoId = (url: string) => {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : '';
  };

  // Gestion de la lecture automatique selon le type de vidéo
  useEffect(() => {
    if (isMp4 && videoRef.current) {
      videoRef.current.muted = isMuted;
      if (isActive) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(console.error);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive, isMp4, isMuted]);

  const handleVideoClick = () => {
    if (isMp4 && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    } else if (isYouTube || isVimeo) {
      setIsPlaying(!isPlaying);
    }
  };

  const handleActionClick = (action: () => void) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    action();
  };

  const handleLike = () => {
    handleActionClick(() => {
      const wasLiked = isLiked;
      toggleLike();
      if (!wasLiked && onLikeWithConfetti) {
        onLikeWithConfetti();
      }
    });
  };

  const handleFollow = () => {
    handleActionClick(() => {
      setIsFollowing(!isFollowing);
      toast.success(isFollowing ? 'Désabonné' : 'Abonné !');
    });
  };

  const handleSave = () => {
    handleActionClick(() => {
      setIsSaved(!isSaved);
      toast.success(isSaved ? 'Vidéo retirée des favoris' : 'Vidéo ajoutée aux favoris');
    });
  };

  const handleFormationRedirect = () => {
    if (video.formation_id) {
      navigate(`/formation/${video.formation_id}`);
    }
  };

  const formatCount = (count: number) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return (count / 1000).toFixed(1) + 'K';
    return (count / 1000000).toFixed(1) + 'M';
  };

  const handleCommentClose = () => {
    setShowComments(false);
    // Notifier le parent qu'un commentaire a été ajouté pour rafraîchir les compteurs
    if (onCommentAdded) {
      onCommentAdded();
    }
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Conteneur vidéo responsive */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Vidéos YouTube */}
        {isYouTube && (
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${getYouTubeId(video.video_url)}?autoplay=${isActive ? 1 : 0}&mute=${isMuted ? 1 : 0}&loop=1&controls=0&showinfo=0&rel=0&modestbranding=1&playlist=${getYouTubeId(video.video_url)}`}
            className="absolute inset-0 w-full h-full"
            style={{
              width: '100vw',
              height: '100vh',
              objectFit: 'cover'
            }}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
          />
        )}

        {/* Vidéos Vimeo */}
        {isVimeo && (
          <iframe
            src={`https://player.vimeo.com/video/${getVimeoId(video.video_url)}?autoplay=${isActive ? 1 : 0}&loop=1&muted=${isMuted ? 1 : 0}&controls=0&background=1`}
            className="absolute inset-0 w-full h-full"
            style={{
              width: '100vw',
              height: '100vh',
              objectFit: 'cover'
            }}
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
          />
        )}

        {/* Vidéos MP4 */}
        {isMp4 && (
          <video
            ref={videoRef}
            src={video.video_url}
            poster={video.thumbnail_url}
            className="absolute inset-0 w-full h-full object-cover cursor-pointer"
            style={{
              width: '100vw',
              height: '100vh',
              objectFit: 'cover'
            }}
            muted={isMuted}
            loop
            playsInline
            onClick={handleVideoClick}
            onLoadedData={() => setIsLoading(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        )}

        {/* Overlay de chargement */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}

        {/* Bouton play/pause pour toutes les vidéos */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Button
              variant="ghost"
              size="icon"
              className="w-16 h-16 rounded-full bg-black/30 text-white hover:bg-black/50 pointer-events-auto"
              onClick={handleVideoClick}
            >
              <Play size={32} />
            </Button>
          </div>
        )}
      </div>

      {/* Actions côté droit */}
      <div className="absolute right-3 bottom-20 flex flex-col items-center space-y-4 z-10">
        {/* Avatar du créateur avec bouton d'abonnement */}
        <div className="relative">
          <Avatar className="w-12 h-12 border-2 border-white">
            <AvatarImage src={video.profiles?.avatar_url} />
            <AvatarFallback className="bg-gray-600 text-white text-sm">
              {video.profiles?.first_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <Button
            onClick={handleFollow}
            size="sm"
            className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full text-xs font-bold ${
              isFollowing 
                ? 'bg-gray-500 text-white' 
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            {isFollowing ? '✓' : <Plus size={12} />}
          </Button>
        </div>

        {/* Bouton Like */}
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLike}
            className={`w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 ${
              isLiked ? 'text-red-500' : ''
            }`}
          >
            <Heart size={24} className={isLiked ? 'fill-current' : ''} />
          </Button>
          <span className="text-white text-xs mt-1 font-medium">
            {formatCount(likesCount)}
          </span>
        </div>

        {/* Bouton Commentaires */}
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleActionClick(() => setShowComments(true))}
            className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
          >
            <MessageCircle size={24} />
          </Button>
          <span className="text-white text-xs mt-1 font-medium">
            {formatCount(video.comments_count)}
          </span>
        </div>

        {/* Bouton Partager */}
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowShare(true)}
            className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
          >
            <Share size={24} />
          </Button>
          <span className="text-white text-xs mt-1 font-medium">
            Partager
          </span>
        </div>

        {/* Bouton Sauvegarder */}
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            className={`w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 ${
              isSaved ? 'text-yellow-500' : ''
            }`}
          >
            <Bookmark size={24} className={isSaved ? 'fill-current' : ''} />
          </Button>
          <span className="text-white text-xs mt-1 font-medium">
            {isSaved ? 'Sauvé' : 'Sauver'}
          </span>
        </div>

        {/* Bouton Formation (pour les vidéos promo) */}
        {video.video_type === 'promo' && video.formation_id && (
          <div className="flex flex-col items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFormationRedirect}
              className="w-12 h-12 rounded-full bg-edu-primary/80 backdrop-blur-sm text-white hover:bg-edu-primary"
            >
              <ShoppingBag size={24} />
            </Button>
            <span className="text-white text-xs mt-1 font-medium">
              Formation
            </span>
          </div>
        )}
      </div>

      {/* Informations vidéo en bas à gauche */}
      <div className="absolute left-4 bottom-20 right-20 z-10">
        <div className="text-white">
          <div className="flex items-center space-x-2 mb-2">
            <span className="font-semibold">
              @{video.profiles?.username || video.profiles?.first_name || 'Utilisateur'}
            </span>
            {video.video_type === 'promo' && (
              <span className="bg-edu-primary px-2 py-1 rounded-full text-xs font-bold">
                PROMO
              </span>
            )}
          </div>
          <h3 className="font-bold text-lg mb-1 line-clamp-2">{video.title}</h3>
          {video.description && (
            <p className="text-sm opacity-90 line-clamp-3">{video.description}</p>
          )}
          {video.price && (
            <div className="mt-2">
              <span className="bg-green-500 px-2 py-1 rounded-full text-xs font-bold">
                {video.price}€
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modaux */}
      <VideoCommentsModal
        isOpen={showComments}
        onClose={handleCommentClose}
        videoId={video.id}
        videoTitle={video.title}
      />

      <VideoShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        url={window.location.href}
        title={video.title}
        description={video.description}
      />
    </div>
  );
};

export default VideoCard;