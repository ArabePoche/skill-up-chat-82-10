import React from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVideoLikes } from '@/hooks/useVideoLikes';
import ConfettiAnimation from '@/components/ConfettiAnimation';

interface VideoLikeProps {
  videoId: string;
  initialLikesCount: number;
  onLikeWithConfetti?: () => void;
}

const VideoLike: React.FC<VideoLikeProps> = ({ 
  videoId, 
  initialLikesCount, 
  onLikeWithConfetti 
}) => {
  const { isLiked, likesCount, toggleLike, isLoading } = useVideoLikes(videoId, initialLikesCount);
  const [showConfetti, setShowConfetti] = React.useState(false);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike();
    
    if (!isLiked) {
      setShowConfetti(true);
      onLikeWithConfetti?.();
    }
  };

  const formatCount = (count: number) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return (count / 1000).toFixed(1) + 'K';
    return (count / 1000000).toFixed(1) + 'M';
  };

  return (
    <>
      <div className="flex flex-col items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          disabled={isLoading}
          className={`w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-all duration-200 flex items-center justify-center border border-white/20 ${
            isLiked ? 'text-red-500 bg-red-500/30' : ''
          }`}
        >
          <Heart 
            size={20} 
            className={`${isLiked ? 'fill-current' : ''}`} 
          />
        </Button>
        <span className="text-white text-xs mt-1 font-medium">
          {formatCount(likesCount)}
        </span>
      </div>
      
      <ConfettiAnimation 
        isActive={showConfetti} 
        onComplete={() => setShowConfetti(false)} 
      />
    </>
  );
};

export default VideoLike;