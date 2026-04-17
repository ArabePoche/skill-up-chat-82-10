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
        className="w-12 h-12 rounded-full text-white transition-all hover:scale-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
      >
        <Send size={24} fill="currentColor" />
      </Button>
      <span className="text-white text-xs mt-1 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
        {formatCount(sharesCount)}
      </span>
    </div>
  );
};

export default TiktokVideoShareButton;
