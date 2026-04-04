
import React, { useState } from 'react';
import { Heart, MessageCircle, Share, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVideoLikes } from '@/hooks/useVideoLikes';
import { useVideoComments } from '@/hooks/useVideoComments';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { recordHabbahGain } from '@/services/habbahService';
import { notifyHabbahGain } from '@/hooks/useHabbahGainNotifier';

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
  const { user } = useAuth();
  
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

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const wasLiked = isLiked;
    toggleLike();

    if (!wasLiked && user?.id) {
       try {
         const reward = await recordHabbahGain(user.id, 'like', video.id);
         if (reward) notifyHabbahGain(reward.amount, reward.label);
       } catch (error) {
         console.error('Error logging habbah video like:', error);
       }
    }
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
    'w-14 h-14 rounded-full text-white transition-all duration-200 hover:scale-110 flex items-center justify-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]';

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
        <span className="text-white text-xs mt-1 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
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
        <span className="text-white text-xs mt-1 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
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
        <span className="text-white text-xs mt-1 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">Partager</span>
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
        <span className="text-white text-xs mt-1 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          {isSaved ? 'Sauvé' : 'Sauver'}
        </span>
      </div>
    </div>
  );
};

export default VideoActions;
