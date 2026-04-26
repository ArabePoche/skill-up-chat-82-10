import React from 'react';
import { Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TiktokVideoGiftButtonProps {
  onGiftClick: () => void;
}

const TiktokVideoGiftButton: React.FC<TiktokVideoGiftButtonProps> = ({ onGiftClick }) => {
  return (
    <div className="flex flex-col items-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={onGiftClick}
        className="h-14 w-14 p-0 rounded-full text-white transition-all hover:scale-110 hover:bg-transparent"
      >
        <Gift size={41} strokeWidth={1.8} className="!w-[41px] !h-[41px] fill-transparent stroke-pink-500 text-pink-500 drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]" />
      </Button>
      <span className="text-white text-sm -mt-0.5 font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.75)]">
        Cadeau
      </span>
    </div>
  );
};

export default TiktokVideoGiftButton;
