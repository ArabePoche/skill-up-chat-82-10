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
        className="w-auto h-auto p-1 rounded-none text-white hover:bg-white/10"
      >
        <ShoppingBag size={32} className="fill-white stroke-white" />
      </Button>
      <span className="text-white text-xs mt-0.5 font-medium">
        {t('video.formation')}
      </span>
    </div>
  );
};

export default TiktokVideoFormationButton;
