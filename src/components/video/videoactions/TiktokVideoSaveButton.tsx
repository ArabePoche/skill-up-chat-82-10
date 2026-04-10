import React from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface TiktokVideoSaveButtonProps {
  isSaved: boolean;
  onSave: () => void;
}

const TiktokVideoSaveButton: React.FC<TiktokVideoSaveButtonProps> = ({ isSaved, onSave }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={onSave}
        className={`w-12 h-12 rounded-full text-white transition-all hover:scale-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${
          isSaved ? 'text-yellow-500' : ''
        }`}
      >
        <Bookmark size={24} className={isSaved ? 'fill-current' : ''} />
      </Button>
      <span className="text-white text-xs mt-1 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
        {isSaved ? t('video.saved') : t('video.save')}
      </span>
    </div>
  );
};

export default TiktokVideoSaveButton;
