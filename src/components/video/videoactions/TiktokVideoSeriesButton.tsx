import React from 'react';
import { List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface TiktokVideoSeriesButtonProps {
  onSeriesClick: () => void;
}

const TiktokVideoSeriesButton: React.FC<TiktokVideoSeriesButtonProps> = ({ onSeriesClick }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={onSeriesClick}
        className="w-12 h-12 rounded-full bg-primary/80 backdrop-blur-sm text-white hover:bg-primary"
      >
        <List size={24} />
      </Button>
      <span className="text-white text-xs mt-1 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
        {t('video.series')}
      </span>
    </div>
  );
};

export default TiktokVideoSeriesButton;
