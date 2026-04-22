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
        className="w-auto h-auto p-1 rounded-none text-white transition-all hover:scale-110"
      >
        <Gift size={32} className="fill-transparent stroke-pink-500 text-pink-500" />
      </Button>
      <span className="text-white text-xs mt-0.5 font-medium">
        Cadeau
      </span>
    </div>
  );
};

export default TiktokVideoGiftButton;
