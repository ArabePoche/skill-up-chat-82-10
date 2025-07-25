
import React, { useState } from 'react';
import { Heart, MessageCircle, Share, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVideoLikes } from '@/hooks/useVideoLikes';
import { useVideoComments } from '@/hooks/useVideoComments';
import { toast } from 'sonner';

interface Video {
  id: string;
  likes_count: number;
  comments_count: number;
}

interface VideoActionsProps {
  video: Video;
  onCommentClick?: () => void;
  onShareClick?: () => void;
}

const VideoActions: React.FC<VideoActionsProps> = ({
  video,
  onCommentClick,
  onShareClick
}) => {
  const [isSaved, setIsSaved] = useState(false);

  const {
    isLiked,
    likesCount,
    toggleLike,
    isLoading: isLikeLoading
  } = useVideoLikes(video.id, video.likes_count);

  const {
    commentsCount,
    isLoading: isCommentsLoading
  } = useVideoComments(video.id); // ✅ Importation du hook commentaire

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike();
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCommentClick?.();
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShareClick?.();
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    toast.success(isSaved ? 'Vidéo retirée des favoris' : 'Vidéo ajoutée aux favoris');
  };

  const formatCount = (count: number) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return (count / 1000).toFixed(1) + 'K';
    return (count / 1000000).toFixed(1) + 'M';
  };

  const actionButtonClass =
    'w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-all duration-200 flex items-center justify-center border border-white/20';

  return (
    <div className="flex flex-col items-center space-y-4 z-30">
      {/* Like */}
      <div className="flex flex-col items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          disabled={isLikeLoading}
          className={`${actionButtonClass} ${isLiked ? 'text-red-500 bg-red-500/30' : ''}`}
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
          variant="ghost"
          size="sm"
          onClick={handleComment}
          className={actionButtonClass}
        >
          <MessageCircle size={20} />
        </Button>
        <span className="text-white text-xs mt-1 font-medium">
          {isCommentsLoading ? '...' : formatCount(commentsCount)}
        </span>
      </div>

      {/* Share */}
      <div className="flex flex-col items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className={actionButtonClass}
        >
          <Share size={20} />
        </Button>
        <span className="text-white text-xs mt-1 font-medium">Partager</span>
      </div>

      {/* Save */}
      <div className="flex flex-col items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          className={`${actionButtonClass} ${isSaved ? 'text-yellow-500 bg-yellow-500/30' : ''}`}
        >
          <Bookmark size={20} className={isSaved ? 'fill-current' : ''} />
        </Button>
        <span className="text-white text-xs mt-1 font-medium">
          {isSaved ? 'Sauvé' : 'Sauver'}
        </span>
      </div>
    </div>
  );
};

export default VideoActions;
