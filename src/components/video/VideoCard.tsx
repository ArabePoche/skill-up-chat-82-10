import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Share, Play, Pause, Plus, ShoppingBag, List, Eye, Gift } from 'lucide-react';
import ExpandableDescription from './ExpandableDescription';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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

// Actions components
import VideoSidebar from './videoactions/VideoSidebar';

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  likes_count: number;
  comments_count: number;
  shares_count?: number;
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
  const [isLoading, setIsLoading] = useState(true);
  const [hasMediaError, setHasMediaError] = useState(false);
  const [showLikeBurst, setShowLikeBurst] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const heartIdRef = useRef(0);
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

  // Poll for active live
  const { data: activeLiveStream } = useQuery({
    queryKey: ['active-live-stream', video.author_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_live_streams')
        .select('id')
        .eq('host_id', video.author_id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!video.author_id && video.author_id !== user?.id,
    refetchInterval: 30000,
  });

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

  const performLike = useCallback((rewardPosition: { x: number; y: number }) => {
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
              notifyHabbahGain(reward.amount, reward.label, rewardPosition);
            }
          } catch (error) {
            console.error('Error logging habbah video like:', error);
          }
        }
      }
    });
  }, [isLiked, toggleLike, onLikeWithConfetti, user?.id, video.id]);

  const handleLike = (event: React.MouseEvent<HTMLButtonElement>) => {
    const triggerRect = event.currentTarget.getBoundingClientRect();
    performLike({
      x: triggerRect.left - 96,
      y: triggerRect.top - 8,
    });
  };

  const triggerLikeAtPosition = useCallback((x: number, y: number) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    const heartId = ++heartIdRef.current;
    setFloatingHearts((prev) => [...prev, { id: heartId, x, y }]);
    window.setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId));
    }, 1000);
    if (!isLiked) {
      performLike({ x: x - 24, y: y - 64 });
    }
  }, [user, navigate, isLiked, performLike]);

  const handleVideoTap = useCallback((event: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => {
    if (longPressEvents.isLongPress?.current) {
      return;
    }
    const now = Date.now();
    const x = event.clientX;
    const y = event.clientY;
    const last = lastTapRef.current;
    const DOUBLE_TAP_DELAY = 300;
    const DOUBLE_TAP_DISTANCE = 50;

    if (
      last &&
      now - last.time < DOUBLE_TAP_DELAY &&
      Math.abs(x - last.x) < DOUBLE_TAP_DISTANCE &&
      Math.abs(y - last.y) < DOUBLE_TAP_DISTANCE
    ) {
      lastTapRef.current = null;
      triggerLikeAtPosition(x, y);
    } else {
      lastTapRef.current = { time: now, x, y };
    }
  }, [longPressEvents.isLongPress, triggerLikeAtPosition]);

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

  const handleFormationRedirect = () => {
    if (video.formation_id) {
      navigate(`/formation/${video.formation_id}`);
    }
  };

  const handleProfileClick = () => {
    if (activeLiveStream) {
      navigate(`/live/${activeLiveStream.id}`);
    } else if (video.author_id) {
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
                    onClick={(e) => { handleVideoTap(e); setIsPlaying(!isPlaying); }} 
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
                    onClick={(e) => { handleVideoTap(e); setIsPlaying(!isPlaying); }} 
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
            onTap={handleVideoTap}
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


      {/* Coeurs flottants pour le double-tap */}
      <AnimatePresence>
        {floatingHearts.map((heart) => (
          <motion.div
            key={heart.id}
            className="fixed pointer-events-none z-50"
            style={{ left: heart.x - 48, top: heart.y - 48 }}
            initial={{ scale: 0, opacity: 1, rotate: -15 }}
            animate={{ scale: [0, 1.4, 1.1], opacity: [1, 1, 0], y: -60, rotate: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <Heart size={96} className="text-red-500 drop-shadow-lg" fill="currentColor" />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Actions côté droit regroupées dans la Sidebar */}
      <VideoSidebar
        video={video}
        user={user}
        activeLiveStream={activeLiveStream}
        friendshipStatus={friendshipStatus as 'none' | 'pending_sent' | 'pending_received' | 'friends'}
        isFollowLoading={isFollowLoading}
        isLiked={isLiked}
        likesCount={likesCount}
        commentsCount={commentsCount}
        sharesCount={video.shares_count ?? 0}
        showLikeBurst={showLikeBurst}
        seriesData={seriesData}
        onFollow={handleFollow}
        onProfileClick={handleProfileClick}
        onLike={handleLike}
        onCommentClick={() => setShowComments(true)}
        onShareClick={() => setShowShare(true)}
        onGiftClick={() => setShowGift(true)}
        onSeriesClick={() => setShowSeries(true)}
        onFormationRedirect={handleFormationRedirect}
        formatCount={formatCount}
      />

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
            <ExpandableDescription description={video.description} />
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
        thumbnailUrl={video.thumbnail_url}
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