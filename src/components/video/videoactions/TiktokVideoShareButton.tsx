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
        className="h-12 w-12 p-0 rounded-full text-white transition-all hover:scale-110 hover:bg-white/10"
      >
        <Send size={40} strokeWidth={1.6} className="fill-white stroke-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]" />
      </Button>
      <span className="text-white text-sm mt-1 font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.75)]">
        {formatCount(sharesCount)}
      </span>
    </div>
  );
};

export default TiktokVideoShareButton;
