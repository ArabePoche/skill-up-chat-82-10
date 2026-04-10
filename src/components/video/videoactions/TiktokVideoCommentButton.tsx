import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TiktokVideoCommentButtonProps {
  commentsCount: number;
  onCommentClick: () => void;
  formatCount: (count: number) => string;
}

const TiktokVideoCommentButton: React.FC<TiktokVideoCommentButtonProps> = ({
  commentsCount,
  onCommentClick,
  formatCount,
}) => {
  return (
    <div className="flex flex-col items-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={onCommentClick}
        className="w-12 h-12 rounded-full text-white transition-all hover:scale-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
      >
        <MessageCircle size={24} />
      </Button>
      <span className="text-white text-xs mt-1 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
        {formatCount(commentsCount)}
      </span>
    </div>
  );
};

export default TiktokVideoCommentButton;
