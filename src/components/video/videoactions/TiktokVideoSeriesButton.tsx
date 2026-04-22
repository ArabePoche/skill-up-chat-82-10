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
        className="w-auto h-auto p-1 rounded-none text-white hover:bg-white/10"
      >
        <List size={32} className="fill-white stroke-white" />
      </Button>
      <span className="text-white text-xs mt-0.5 font-medium">
        {t('video.series')}
      </span>
    </div>
  );
};

export default TiktokVideoSeriesButton;
