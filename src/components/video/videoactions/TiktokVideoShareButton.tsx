import React from 'react';
import { Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface TiktokVideoShareButtonProps {
  onShareClick: () => void;
}

const TiktokVideoShareButton: React.FC<TiktokVideoShareButtonProps> = ({ onShareClick }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={onShareClick}
        className="w-12 h-12 rounded-full text-white transition-all hover:scale-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
      >
        <Share size={24} />
      </Button>
      <span className="text-white text-xs mt-1 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
        {t('video.share')}
      </span>
    </div>
  );
};

export default TiktokVideoShareButton;
