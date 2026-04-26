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
        className="h-12 w-12 p-0 rounded-full text-white transition-all hover:scale-110 hover:bg-transparent"
      >
        <MessageCircle size={42} strokeWidth={1.6} className="fill-white stroke-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]" />
      </Button>
      <span className="text-white text-sm mt-1 font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.75)]">
        {formatCount(commentsCount)}
      </span>
    </div>
  );
};

export default TiktokVideoCommentButton;
