
import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share, Bookmark, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useVideoLikes } from '@/hooks/useVideoLikes';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import VideoCommentsModal from './VideoCommentsModal';
import ShareModal from '@/components/ShareModal';
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
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

  // Gestion de la lecture/pause pour les vidéos MP4
  useEffect(() => {
    if (!videoRef.current || !isMp4) return;

    if (isActive) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive, isMp4]);

  const handleVideoClick = () => {
    if (!videoRef.current || !isMp4) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
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
      toggleLike();
      if (onLikeWithConfetti) {
        onLikeWithConfetti();
      }
    });
  };

  const handleSave = () => {
    handleActionClick(() => {
      setIsSaved(!isSaved);
      toast.success(isSaved ? 'Vidéo retirée des favoris' : 'Vidéo ajoutée aux favoris');
    });
  };

  const formatCount = (count: number) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return (count / 1000).toFixed(1) + 'K';
    return (count / 1000000).toFixed(1) + 'M';
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Conteneur vidéo avec aspect ratio parfait */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Vidéos YouTube */}
        {isYouTube && (
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${getYouTubeId(video.video_url)}?autoplay=${isActive ? 1 : 0}&mute=1&loop=1&controls=0&showinfo=0&rel=0&modestbranding=1&playlist=${getYouTubeId(video.video_url)}`}
            className="w-full h-full object-cover"
            style={{
              minWidth: '100%',
              minHeight: '100%',
              transform: 'scale(1.1)', // Légère augmentation pour éviter les bandes noires
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
            src={`https://player.vimeo.com/video/${getVimeoId(video.video_url)}?autoplay=${isActive ? 1 : 0}&loop=1&muted=1&controls=0&background=1`}
            className="w-full h-full object-cover"
            style={{
              minWidth: '100%',
              minHeight: '100%',
              transform: 'scale(1.1)',
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
            className="w-full h-full object-cover cursor-pointer"
            style={{
              minWidth: '100%',
              minHeight: '100%',
            }}
            muted
            loop
            playsInline
            onClick={handleVideoClick}
            onLoadedData={() => setIsLoading(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        )}

        {/* Indicateur de chargement */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}

        {/* Bouton play/pause pour MP4 */}
        {isMp4 && !isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="w-16 h-16 rounded-full bg-black/30 text-white hover:bg-black/50"
              onClick={handleVideoClick}
            >
              <Play size={32} />
            </Button>
          </div>
        )}
      </div>

      {/* Actions côté droit */}
      <div className="absolute right-3 bottom-20 flex flex-col items-center space-y-4 z-10">
        {/* Avatar du créateur */}
        <div className="relative">
          <Avatar className="w-12 h-12 border-2 border-white">
            <AvatarImage src={video.profiles?.avatar_url} />
            <AvatarFallback className="bg-gray-600 text-white text-sm">
              {video.profiles?.first_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
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
      </div>

      {/* Informations vidéo en bas à gauche */}
      <div className="absolute left-4 bottom-20 right-20 z-10">
        <div className="text-white">
          <div className="flex items-center space-x-2 mb-2">
            <span className="font-semibold">
              @{video.profiles?.username || video.profiles?.first_name || 'Utilisateur'}
            </span>
          </div>
          <h3 className="font-bold text-lg mb-1 line-clamp-2">{video.title}</h3>
          {video.description && (
            <p className="text-sm opacity-90 line-clamp-3">{video.description}</p>
          )}
        </div>
      </div>

      {/* Modaux */}
      <VideoCommentsModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        videoId={video.id}
      />

      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        content={{
          title: video.title,
          description: video.description,
          url: window.location.href
        }}
      />
    </div>
  );
};

export default VideoCard;
