import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface TiktokVideoFormationButtonProps {
  onFormationRedirect: () => void;
}

const TiktokVideoFormationButton: React.FC<TiktokVideoFormationButtonProps> = ({ onFormationRedirect }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={onFormationRedirect}
        className="w-12 h-12 rounded-full bg-edu-primary/80 backdrop-blur-sm text-white hover:bg-edu-primary"
      >
        <ShoppingBag size={24} />
      </Button>
      <span className="text-white text-xs mt-1 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
        {t('video.formation')}
      </span>
    </div>
  );
};

export default TiktokVideoFormationButton;
