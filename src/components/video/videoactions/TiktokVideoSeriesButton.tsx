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
        className="h-12 w-12 p-0 rounded-full text-white transition-all hover:scale-110 hover:bg-white/10"
      >
        <List size={40} strokeWidth={1.8} className="stroke-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]" />
      </Button>
      <span className="text-white text-sm mt-1 font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.75)]">
        {t('video.series')}
      </span>
    </div>
  );
};

export default TiktokVideoSeriesButton;
