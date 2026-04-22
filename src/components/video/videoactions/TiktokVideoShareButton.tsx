import React from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TiktokVideoShareButtonProps {
  onShareClick: () => void;
  sharesCount: number;
  formatCount: (count: number) => string;
}

const TiktokVideoShareButton: React.FC<TiktokVideoShareButtonProps> = ({
  onShareClick,
  sharesCount,
  formatCount,
}) => {
  return (
    <div className="flex flex-col items-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={onShareClick}
        className="w-auto h-auto p-1 rounded-none text-white transition-all hover:scale-110"
      >
        <Send size={32} className="fill-white stroke-white" />
      </Button>
      <span className="text-white text-xs mt-0.5 font-medium">
        {formatCount(sharesCount)}
      </span>
    </div>
  );
};

export default TiktokVideoShareButton;
