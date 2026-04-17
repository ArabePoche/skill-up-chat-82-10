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
        className="w-12 h-12 rounded-full text-white transition-all hover:scale-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
      >
        <Gift size={28} className="text-pink-500" />
      </Button>
      <span className="text-white text-xs mt-0.5 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
        Cadeau
      </span>
    </div>
  );
};

export default TiktokVideoGiftButton;
