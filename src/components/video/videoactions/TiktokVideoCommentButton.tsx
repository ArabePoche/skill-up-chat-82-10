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
        className="w-auto h-auto p-1 rounded-none text-white transition-all hover:scale-110"
      >
        <MessageCircle size={32} className="fill-white stroke-white" />
      </Button>
      <span className="text-white text-xs mt-0.5 font-medium">
        {formatCount(commentsCount)}
      </span>
    </div>
  );
};

export default TiktokVideoCommentButton;
