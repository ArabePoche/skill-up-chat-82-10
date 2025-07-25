
import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoCommentProps {
  commentsCount: number;
  onCommentClick: () => void;
}

const VideoComment: React.FC<VideoCommentProps> = ({ 
  commentsCount, 
  onCommentClick 
}) => {
  const formatCount = (count: number) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return (count / 1000).toFixed(1) + 'K';
    return (count / 1000000).toFixed(1) + 'M';
  };

  return (
    <div className="flex flex-col items-center">
      <Button
        variant="ghost"
        size="sm"
        onClick={onCommentClick}
        className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-all duration-200 flex items-center justify-center border border-white/20"
      >
        <MessageCircle size={20} />
      </Button>
      <span className="text-white text-xs mt-1 font-medium">
        {formatCount(commentsCount)}
      </span>
    </div>
  );
};

export default VideoComment;
