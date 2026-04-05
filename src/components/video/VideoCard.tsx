import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Share, Bookmark, Play, Pause, Plus, ShoppingBag, List, Eye, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useVideoLikes } from '@/hooks/useVideoLikes';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import VideoCommentsModal from './VideoCommentsModal';
import VideoShareModal from './VideoShareModal';
import VideoDownloadModal from './VideoDownloadModal';
import { VideoGiftModal } from './VideoGiftModal';
import SeriesEpisodesModal from './SeriesEpisodesModal';
import FloatingCommentBar from './FloatingCommentBar';
import { useVideoComments } from '@/hooks/useVideoComments';
import { useGlobalSound } from '@/components/TikTokVideosView';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFollow } from '@/friends/hooks/useFollow';
import { useVideoSeries } from '@/hooks/useVideoSeries';
import { useVideoViews } from '@/hooks/useVideoViews';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useTranslation } from 'react-i18next';
import { useLongPress } from '@/hooks/useLongPress';
import { recordHabbahGain } from '@/services/habbahService';
import { notifyHabbahGain } from '@/hooks/useHabbahGainNotifier';
import NativeVideoPlayer from './players/NativeVideoPlayer';
import YouTubePlayer from './players/YouTubePlayer';
import VimeoPlayer from './players/VimeoPlayer';
import { AnimatePresence, motion } from 'framer-motion';

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  likes_count: number;
  comments_count: number;
  views_count?: number;
  author_id: string;
  video_type?: string;
  formation_id?: string;
  price?: number;
  profiles?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
    is_verified?: boolean;
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
  const { t } = useTranslation();
  
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [showSeries, setShowSeries] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMediaError, setHasMediaError] = useState(false);
  const [showLikeBurst, setShowLikeBurst] = useState(false);
//   const [mediaRetryKey, setMediaRetryKey] = useState(0);

  // Long press pour ouvrir le modal de téléchargement
  const handleLongPress = useCallback(() => {
    setShowDownload(true);
  }, []);

  const handleCommentClose = useCallback(() => {
    setShowComments(false);
  }, []);

  const { isLongPress, ...longPressEvents } = useLongPress({
    duration: 900,
    onLongPress: handleLongPress,
  });

  const shouldLoadEngagementData = isActive || showComments || showShare || showSeries || showGift;
  const vimeoPlayerId = useMemo(() => `vimeo-player-${video.id}`, [video.id]);

  const { isLiked, likesCount, toggleLike } = useVideoLikes(video.id, video.likes_count, {
    enabled: shouldLoadEngagementData,
  });
  const { addComment, isSubmitting: isCommentSubmitting } = useVideoComments(video.id);
  const { friendshipStatus, sendRequest, cancelRequest, removeFriend, isLoading: isFollowLoading } = useFollow(video.author_id, {
    enabled: shouldLoadEngagementData,
  });
  const { data: seriesData } = useVideoSeries(video.id, {
    enabled: shouldLoadEngagementData,
  });
  
  // Tracker les vues
  useVideoViews(video.id, isActive);

  // Récupération dynamique du compteur de commentaires
  const { data: commentsCount = video.comments_count } = useQuery({
    queryKey: ['video-comments-count', video.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('video_comments')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', video.id)
        .is('parent_comment_id', null);

      if (error) {
        console.error('Erreur comptage commentaires :', error);
        return video.comments_count;
      }

      return count ?? video.comments_count;
    },
    enabled: shouldLoadEngagementData && !!video.id,
    staleTime: 60000, 
    refetchInterval: false,
  });

  // Détection du type de vidéo
  const isYouTube = video.video_url.includes('youtube.com') || video.video_url.includes('youtu.be');
  const isVimeo = video.video_url.includes('vimeo.com');
  const isNativeVideo = !isYouTube && !isVimeo;

  // Sync isPlaying with isActive
  useEffect(() => {
    // Ne forcer isPlaying que lorsque la carte devient active.
    // L'enfant (NativeVideo, Youtube, etc.) peut repasser isPlaying à false
    // s'il détecte que l'autoplay est bloqué par le navigateur.
    if (isActive) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [isActive]);

  useEffect(() => {
    setIsLoading(true);
    setHasMediaError(false);
  }, [video.id, video.video_url]);

  // Timeout d'erreur de chargement
  useEffect(() => {
    if (!isActive || !isLoading || hasMediaError) {
      return;
    }
    const timer = window.setTimeout(() => {
    //   setHasMediaError(true);
    //   setIsLoading(false);
    }, 15000); // Augmenté à 15s

    return () => window.clearTimeout(timer);
  }, [hasMediaError, isActive, isLoading]);

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

  const handleAuthRequiredAction = (action: () => void) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    action();
  };

  const handleLike = (event: React.MouseEvent<HTMLButtonElement>) => {
    const triggerRect = event.currentTarget.getBoundingClientRect();

    handleAuthRequiredAction(async () => {
      const wasLiked = isLiked;
      toggleLike();
      if (!wasLiked) {
        setShowLikeBurst(true);
        window.setTimeout(() => setShowLikeBurst(false), 3000);

        if (onLikeWithConfetti) {
          onLikeWithConfetti();
        }
        if (user?.id) {
          try {
            const reward = await recordHabbahGain(user.id, 'like', video.id);
            if (reward) {
              notifyHabbahGain(reward.amount, reward.label, {
                x: triggerRect.left - 96,
                y: triggerRect.top - 8,
              });
            }
          } catch (error) {
            console.error('Error logging habbah video like:', error);
          }
        }
      }
    });
  };

  const handleFollow = () => {
    handleAuthRequiredAction(() => {
      if (friendshipStatus === 'friends') {
        removeFriend();
      } else if (friendshipStatus === 'pending_sent') {
        cancelRequest();
      } else {
        sendRequest();
      }
    });
  };

  const handleSave = () => {
    handleAuthRequiredAction(() => {
      setIsSaved(!isSaved);
      toast.success(isSaved ? t('video.removedFromFavorites') : t('video.savedToFavorites'));
    });
  };

  const handleFormationRedirect = () => {
    if (video.formation_id) {
      navigate(`/formation/${video.formation_id}`);
    }
  };

  const handleProfileClick = () => {
    if (video.author_id) {
      navigate(`/profile/${video.author_id}`);
    }
  };

  const formatCount = (count: number) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return (count / 1000).toFixed(1) + 'K';
    return (count / 1000000).toFixed(1) + 'M';
  };

  const retryMediaLoad = () => {
    setHasMediaError(false);
    setIsLoading(true);
    // setMediaRetryKey((prev) => prev + 1);
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden" {...longPressEvents}>
      {/* Conteneur vidéo responsive */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Vidéos YouTube */}
        {isYouTube && (
            <>
                <YouTubePlayer
                    videoId={getYouTubeId(video.video_url)}
                    isActive={isActive}
                    shouldPlay={isActive && isPlaying}
                    isMuted={isMuted}
                    onLoaded={() => setIsLoading(false)}
                    onError={() => {
                        setHasMediaError(true);
                        setIsLoading(false);
                    }}
                    onPlayStateChange={setIsPlaying}
                />
                <div 
                    className="absolute inset-0 z-[1] bg-transparent" 
                    onClick={() => setIsPlaying(!isPlaying)} 
                />
            </>
        )}

        {/* Vidéos Vimeo */}
        {isVimeo && (
            <>
                <VimeoPlayer
                    videoId={getVimeoId(video.video_url)}
                    uniqueId={vimeoPlayerId}
                    isActive={isActive}
                    shouldPlay={isActive && isPlaying}
                    isMuted={isMuted}
                    onLoaded={() => setIsLoading(false)}
                    onError={() => {
                        setHasMediaError(true);
                        setIsLoading(false);
                    }}
                    onPlayStateChange={setIsPlaying}
                />
                <div 
                    className="absolute inset-0 z-[1] bg-transparent" 
                    onClick={() => setIsPlaying(!isPlaying)} 
                />
            </>
        )}

        {/* Vidéos natives stockées ou servies directement par URL */}
        {isNativeVideo && (
          <NativeVideoPlayer
            src={video.video_url}
            poster={video.thumbnail_url}
            isActive={isActive}
            shouldPlay={isActive && isPlaying}
            isMuted={isMuted}
            onLoaded={() => setIsLoading(false)}
            onError={() => {
                setHasMediaError(true);
                setIsLoading(false);
            }}
            onPlayStateChange={setIsPlaying}
          />
        )}

        {/* Overlay de chargement */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}

        {hasMediaError && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/75 px-6 text-white z-10">
            <div className="max-w-xs text-center">
              <p className="text-sm text-white/80">Impossible de charger cette video pour le moment.</p>
              <Button onClick={retryMediaLoad} className="mt-4 bg-white text-black hover:bg-white/90">
                Reessayer
              </Button>
            </div>
          </div>
        )}

        {/* Bouton play/pause central (feedback visuel seulement quand en pause) */}
        {!isPlaying && !isLoading && !hasMediaError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-16 h-16 rounded-full bg-black/30 text-white flex items-center justify-center">
              <Play size={32} fill="white" />
            </div>
          </div>
        )}
      </div>


      {/* Actions côté droit */}
      <div className="absolute right-3 bottom-20 flex flex-col items-center space-y-4 z-10">
        {/* Avatar du créateur avec bouton d'abonnement */}
        <div className="relative">
          <Avatar 
            className="w-12 h-12 border-2 border-white cursor-pointer"
            onClick={handleProfileClick}
          >
            <AvatarImage src={video.profiles?.avatar_url} />
            <AvatarFallback className="bg-gray-600 text-white text-sm">
              {video.profiles?.first_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          {friendshipStatus === 'none' && (
            <Button
              onClick={handleFollow}
              disabled={isFollowLoading}
              size="sm"
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full text-xs font-bold bg-red-500 text-white hover:bg-red-600"
            >
              <Plus size={12} />
            </Button>
          )}
        </div>

        {/* Bouton Like */}
        <div className="relative flex flex-col items-center">
          <AnimatePresence>
            {showLikeBurst && (
              <>
                <motion.div
                  initial={{ opacity: 0.9, scale: 0.45 }}
                  animate={{ opacity: 0, scale: 3.1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2.8, ease: 'easeOut' }}
                  className="absolute top-0 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full bg-red-500/90 blur-[1px]"
                />
                <motion.div
                  initial={{ opacity: 0.95, scale: 0.8 }}
                  animate={{ opacity: 0, scale: 2.5 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2.2, ease: 'easeOut' }}
                  className="absolute top-0 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full border-2 border-red-300/90"
                />
                {[
                  { x: 0, y: -34 },
                  { x: 26, y: -18 },
                  { x: 30, y: 12 },
                  { x: 0, y: 30 },
                  { x: -28, y: 14 },
                  { x: -24, y: -20 },
                ].map((particle, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0.95, x: 0, y: 0, scale: 0.9 }}
                    animate={{ opacity: 0, x: particle.x, y: particle.y, scale: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: index * 0.05 }}
                    className="absolute left-1/2 top-6 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-red-300"
                  />
                ))}
              </>
            )}
          </AnimatePresence>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLike}
            className={`relative z-10 w-12 h-12 rounded-full border-0 bg-transparent text-white shadow-none transition-all hover:scale-110 hover:bg-white/10 active:bg-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${
              isLiked ? '!text-red-500' : ''
            }`}
          >
            <Heart size={24} className={isLiked ? 'fill-red-500 stroke-red-500 text-red-500' : 'text-white'} />
          </Button>
          <span className="text-white text-xs mt-1 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            {formatCount(likesCount)}
          </span>
        </div>

        {/* Bouton Commentaires - accessible à tous */}
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowComments(true)}
            className="w-12 h-12 rounded-full text-white transition-all hover:scale-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          >
            <MessageCircle size={24} />
          </Button>
          <span className="text-white text-xs mt-1 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            {formatCount(commentsCount)}
          </span>
        </div>

        {/* Bouton Partager */}
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowShare(true)}
            className="w-12 h-12 rounded-full text-white transition-all hover:scale-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          >
            <Share size={24} />
          </Button>
          <span className="text-white text-xs mt-1 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            {t('video.share')}
          </span>
        </div>

        {/* Bouton Cadeau */}
        {user && user.id !== video.author_id && (
          <div className="flex flex-col items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowGift(true)}
              className="w-12 h-12 rounded-full text-white transition-all hover:scale-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            >
              <Gift size={24} className="text-pink-500" />
            </Button>
            <span className="text-white text-xs mt-1 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              Cadeau
            </span>
          </div>
        )}

        {/* Bouton Sauvegarder */}
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            className={`w-12 h-12 rounded-full text-white transition-all hover:scale-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${
              isSaved ? 'text-yellow-500' : ''
            }`}
          >
            <Bookmark size={24} className={isSaved ? 'fill-current' : ''} />
          </Button>
          <span className="text-white text-xs mt-1 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            {isSaved ? t('video.saved') : t('video.save')}
          </span>
        </div>

        {/* Bouton Série (pour les vidéos qui appartiennent à une série) */}
        {seriesData && (
          <div className="flex flex-col items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSeries(true)}
              className="w-12 h-12 rounded-full bg-primary/80 backdrop-blur-sm text-white hover:bg-primary"
            >
              <List size={24} />
            </Button>
            <span className="text-white text-xs mt-1 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              {t('video.series')}
            </span>
          </div>
        )}

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
            <span className="text-white text-xs mt-1 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              {t('video.formation')}
            </span>
          </div>
        )}
      </div>

      {/* Informations vidéo en bas à gauche */}
      <div className="absolute left-4 right-24 z-10 bottom-20">
        <div className="text-white">
          <div className="flex items-center space-x-2 mb-2">
            <span 
              className="font-semibold cursor-pointer hover:underline inline-flex items-center gap-1"
              onClick={handleProfileClick}
            >
              @{video.profiles?.username || video.profiles?.first_name || t('video.user')}
              {video.profiles?.is_verified && <VerifiedBadge size={16} showTooltip={false} />}
            </span>
            {video.video_type === 'promo' && (
              <span className="bg-edu-primary px-2 py-1 rounded-full text-xs font-bold">
                {t('video.promo')}
              </span>
            )}
          </div>
          <h3 className="font-bold text-lg mb-1 line-clamp-2">{video.title}</h3>
          {video.description && (
            <p className="text-sm opacity-90 line-clamp-3">{video.description}</p>
          )}
          
          {/* Afficher le nombre de vues */}
          {video.views_count !== undefined && video.views_count > 0 && (
            <div className="flex items-center space-x-1 mt-2 text-sm opacity-90">
              <Eye size={16} />
              <span>{formatCount(video.views_count)} {t('video.views')}</span>
            </div>
          )}

          {isActive && (
            <FloatingCommentBar
              onSubmit={async (text) => {
                if (!user) { return false; }
                return await addComment(text);
              }}
              isSubmitting={isCommentSubmitting}
              className="mt-3 max-w-full"
            />
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
        url={`${window.location.origin}/video/${video.id}`}
        title={video.title}
        description={video.description}
      />

      {/* Modal des épisodes de série */}
      {seriesData && (
        <SeriesEpisodesModal
          isOpen={showSeries}
          onClose={() => setShowSeries(false)}
          seriesTitle={seriesData.series.title}
          episodes={seriesData.episodes}
          currentVideoId={video.id}
        />
      )}

      {/* Modal de téléchargement (appui long) */}
      <VideoDownloadModal
        isOpen={showDownload}
        onClose={() => setShowDownload(false)}
        videoUrl={video.video_url}
        videoTitle={video.title}
        authorName={video.profiles?.username || video.profiles?.first_name || 'user'}
      />

      {/* Modal Cadeau */}
      <VideoGiftModal
        isOpen={showGift}
        onClose={() => setShowGift(false)}
        recipientId={video.author_id}
        recipientName={video.profiles?.username || video.profiles?.first_name || 'Créateur'}
        videoId={video.id}
        videoTitle={video.title}
      />
    </div>
  );
};

export default VideoCard;