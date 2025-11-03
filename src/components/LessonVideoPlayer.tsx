
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Maximize2, Volume2, VolumeX, ThumbsUp, Share2, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVideoLikes } from '@/hooks/useVideoLikes';
import { useVideoComments } from '@/hooks/useVideoComments';
import { useCommentLikes } from '@/hooks/useCommentLikes';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface LessonVideoPlayerProps {
  videoId?: string;
  url: string;
  className?: string;
  title?: string;
  views?: string;
  channelName?: string;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

const LessonVideoPlayer: React.FC<LessonVideoPlayerProps> = ({ 
  videoId,
  url, 
  className = "",
  title = "Vidéo de la leçon",
  views = "12 345 vues",
  channelName = "Formation Academy",
  onPlayStateChange
}) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Hooks pour les likes et commentaires
  const { isLiked, likesCount, toggleLike, isLoading: isLikeLoading } = useVideoLikes(videoId || '', 0);
  const { comments, commentsCount, addComment, isSubmitting } = useVideoComments(videoId || '');

  const handleLikeClick = () => {
    if (!videoId) return;
    if (!user) {
      toast.error('Connectez-vous pour liker cette vidéo');
      return;
    }
    toggleLike();
  };

  const handleCommentSubmit = async () => {
    if (!videoId) return;
    if (!user) {
      toast.error('Connectez-vous pour commenter');
      return;
    }
    if (!newComment.trim()) return;
    
    const success = await addComment(newComment);
    if (success) {
      setNewComment('');
      toast.success('Commentaire ajouté');
    } else {
      toast.error('Erreur lors de l\'ajout du commentaire');
    }
  };

  const handleReplySubmit = async (parentId: string) => {
    if (!videoId) return;
    if (!user) {
      toast.error('Connectez-vous pour répondre');
      return;
    }
    if (!replyContent.trim()) return;
    
    const success = await addComment(replyContent, parentId);
    if (success) {
      setReplyContent('');
      setReplyingTo(null);
      toast.success('Réponse ajoutée');
    } else {
      toast.error('Erreur lors de l\'ajout de la réponse');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: title,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Lien copié dans le presse-papier');
    }
  };

  if (!url) {
    return (
      <div className="w-full">
        <div className="w-full aspect-video bg-muted flex items-center justify-center rounded-lg">
          <p className="text-muted-foreground">Aucune vidéo disponible</p>
        </div>
        <div className="p-4 bg-background border-x border-b rounded-b-lg">
          <h3 className="font-semibold text-foreground mb-2">Aucune vidéo</h3>
          <p className="text-sm text-muted-foreground">0 vues</p>
        </div>
      </div>
    );
  }

  // Détecter si c'est une URL YouTube
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  
  if (isYouTube) {
    // Extraire l'ID de la vidéo YouTube
    let youtubeVideoId = '';
    
    if (url.includes('youtube.com/watch?v=')) {
      youtubeVideoId = url.split('v=')[1]?.split('&')[0] || '';
    } else if (url.includes('youtu.be/')) {
      youtubeVideoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
    }
    
    if (youtubeVideoId) {
      // Utiliser l'API enablejsapi pour pouvoir détecter les événements
      const embedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1`;
      
      // Simuler le démarrage de lecture quand l'utilisateur clique sur l'iframe
      const handleIframeClick = () => {
        if (!isPlaying) {
          setIsPlaying(true);
          onPlayStateChange?.(true);
        }
      };
      
      return (
        <div className={`w-full ${className}`}>
          <div 
            className="w-full aspect-video rounded-t-lg overflow-hidden relative"
            onClick={handleIframeClick}
          >
            {/* Overlay transparent pour détecter le premier clic */}
            {!isPlaying && (
              <div 
                className="absolute inset-0 z-10 cursor-pointer"
                style={{ pointerEvents: 'auto' }}
              />
            )}
            <iframe
              src={embedUrl}
              title="Vidéo de la leçon"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
              style={{ pointerEvents: isPlaying ? 'auto' : 'none' }}
            />
          </div>
          <div className="p-4 bg-background border-x border-b rounded-b-lg">
            <h3 className="font-semibold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground mb-3">{views}</p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`p-2 ${isLiked ? 'text-primary' : ''}`}
                  onClick={handleLikeClick}
                  disabled={isLikeLoading}
                >
                  <ThumbsUp size={18} fill={isLiked ? 'currentColor' : 'none'} />
                  <span className="ml-1 text-xs">{likesCount}</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-2"
                  onClick={() => setIsCommentsOpen(!isCommentsOpen)}
                >
                  <MessageCircle size={18} />
                  <span className="ml-1 text-xs">{commentsCount}</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-2"
                  onClick={handleShare}
                >
                  <Share2 size={18} />
                </Button>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground font-semibold text-sm">
                      {channelName.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{channelName}</span>
                </div>
              </div>
            </div>

            {/* Section commentaires pliable */}
            <Collapsible open={isCommentsOpen} onOpenChange={setIsCommentsOpen} className="mt-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2">
                  <span className="font-medium">Commentaires ({commentsCount})</span>
                  {isCommentsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                {/* Formulaire d'ajout de commentaire */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Ajouter un commentaire..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[60px]"
                  />
                  <Button 
                    onClick={handleCommentSubmit}
                    disabled={isSubmitting || !newComment.trim()}
                    size="sm"
                  >
                    Publier
                  </Button>
                </div>

                {/* Liste des commentaires */}
                <div className="space-y-4">
                  {comments.map((comment: any) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      replyingTo={replyingTo}
                      replyContent={replyContent}
                      setReplyingTo={setReplyingTo}
                      setReplyContent={setReplyContent}
                      handleReplySubmit={handleReplySubmit}
                      isSubmitting={isSubmitting}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      );
    }
  }

  // Gestion des événements vidéo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    
    const handlePlay = () => {
      setIsPlaying(true);
      onPlayStateChange?.(true);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    const newPlayingState = !isPlaying;
    if (newPlayingState) {
      video.play();
    } else {
      video.pause();
    }
    // Ne pas appeler onPlayStateChange ici car les événements natifs le font déjà
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!isFullscreen) {
      video.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`w-full ${className}`}>
      <div 
        className="relative w-full aspect-video bg-black rounded-t-lg overflow-hidden group cursor-pointer"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={url}
          className="w-full h-full object-contain"
          preload="metadata"
        />

        {/* Bouton play central */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors">
              <Play size={24} className="text-white ml-1" fill="white" />
            </div>
          </div>
        )}

        {/* Contrôles inférieurs */}
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          {/* Barre de progression */}
          <div 
            className="w-full h-1 bg-white/30 rounded-full cursor-pointer mb-3 group/progress"
            onClick={handleProgressClick}
          >
            <div 
              className="h-full bg-red-600 rounded-full relative group-hover/progress:h-1.5 transition-all"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Contrôles */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="text-white hover:text-white hover:bg-white/20 p-2"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="text-white hover:text-white hover:bg-white/20 p-2"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </Button>

              <span className="text-sm font-medium">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="text-white hover:text-white hover:bg-white/20 p-2"
            >
              <Maximize2 size={20} />
            </Button>
          </div>
        </div>
      </div>

      {/* Informations sur la vidéo */}
      <div className="p-4 bg-background border-x border-b rounded-b-lg">
        <h3 className="font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-3">{views}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`p-2 hover:bg-muted ${isLiked ? 'text-primary' : ''}`}
              onClick={handleLikeClick}
              disabled={isLikeLoading}
            >
              <ThumbsUp size={18} fill={isLiked ? 'currentColor' : 'none'} />
              <span className="ml-1 text-xs">{likesCount}</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 hover:bg-muted"
              onClick={() => setIsCommentsOpen(!isCommentsOpen)}
            >
              <MessageCircle size={18} />
              <span className="ml-1 text-xs">{commentsCount}</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 hover:bg-muted"
              onClick={handleShare}
            >
              <Share2 size={18} />
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-semibold text-sm">
                  {channelName.charAt(0)}
                </span>
              </div>
              <span className="text-sm font-medium">{channelName}</span>
            </div>
          </div>
        </div>

        {/* Section commentaires pliable */}
        <Collapsible open={isCommentsOpen} onOpenChange={setIsCommentsOpen} className="mt-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-2">
              <span className="font-medium">Commentaires ({commentsCount})</span>
              {isCommentsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            {/* Formulaire d'ajout de commentaire */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Ajouter un commentaire..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px]"
              />
              <Button 
                onClick={handleCommentSubmit}
                disabled={isSubmitting || !newComment.trim()}
                size="sm"
              >
                Publier
              </Button>
            </div>

            {/* Liste des commentaires */}
            <div className="space-y-4">
              {comments.map((comment: any) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  replyingTo={replyingTo}
                  replyContent={replyContent}
                  setReplyingTo={setReplyingTo}
                  setReplyContent={setReplyContent}
                  handleReplySubmit={handleReplySubmit}
                  isSubmitting={isSubmitting}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

// Composant pour afficher un commentaire
const CommentItem = ({ 
  comment, 
  replyingTo, 
  replyContent, 
  setReplyingTo, 
  setReplyContent, 
  handleReplySubmit,
  isSubmitting 
}: any) => {
  const { isLiked, likesCount, toggleLike } = useCommentLikes(comment.id, comment.likes_count || 0);
  const { user } = useAuth();

  const displayName = comment.profiles?.first_name && comment.profiles?.last_name
    ? `${comment.profiles.first_name} ${comment.profiles.last_name}`
    : comment.profiles?.username || 'Utilisateur';

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={comment.profiles?.avatar_url} />
          <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{displayName}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(comment.created_at).toLocaleDateString('fr-FR')}
            </span>
          </div>
          <p className="text-sm mt-1">{comment.content}</p>
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className={`p-1 h-auto ${isLiked ? 'text-primary' : ''}`}
              onClick={toggleLike}
            >
              <ThumbsUp size={14} fill={isLiked ? 'currentColor' : 'none'} />
              <span className="ml-1 text-xs">{likesCount}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-auto text-xs"
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
            >
              Répondre
            </Button>
          </div>

          {/* Formulaire de réponse */}
          {replyingTo === comment.id && (
            <div className="flex gap-2 mt-2">
              <Textarea
                placeholder="Votre réponse..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[50px] text-sm"
              />
              <div className="flex flex-col gap-1">
                <Button 
                  onClick={() => handleReplySubmit(comment.id)}
                  disabled={isSubmitting || !replyContent.trim()}
                  size="sm"
                >
                  Publier
                </Button>
                <Button 
                  onClick={() => setReplyingTo(null)}
                  variant="ghost"
                  size="sm"
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {/* Réponses */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="ml-6 mt-3 space-y-3 border-l-2 border-border pl-3">
              {comment.replies.map((reply: any) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  replyingTo={replyingTo}
                  replyContent={replyContent}
                  setReplyingTo={setReplyingTo}
                  setReplyContent={setReplyContent}
                  handleReplySubmit={handleReplySubmit}
                  isSubmitting={isSubmitting}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonVideoPlayer;
