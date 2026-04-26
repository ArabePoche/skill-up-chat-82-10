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
        className="h-14 w-14 p-0 rounded-full text-white transition-all hover:scale-110 hover:bg-transparent"
      >
        <ShoppingBag size={50} strokeWidth={1.8} className="!w-[50px] !h-[50px] fill-white stroke-white text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]" />
      </Button>
      <span className="text-white text-sm -mt-0.5 font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.75)]">
        {t('video.formation')}
      </span>
    </div>
  );
};

export default TiktokVideoFormationButton;
