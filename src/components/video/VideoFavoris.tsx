import React, { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface VideoFavorisProps {
  videoId: string;
  initialIsSaved?: boolean;
}

const VideoFavoris: React.FC<VideoFavorisProps> = ({ 
  videoId, 
  initialIsSaved = false 
}) => {
  const [isSaved, setIsSaved] = useState(initialIsSaved);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    toast.success(isSaved ? 'Vidéo retirée des favoris' : 'Vidéo ajoutée aux favoris');
  };

  return (
    <div className="flex flex-col items-center">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSave}
        className={`w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-all duration-200 flex items-center justify-center border border-white/20 ${
          isSaved ? 'text-yellow-500 bg-yellow-500/30' : ''
        }`}
      >
        <Bookmark 
          size={20} 
          className={`${isSaved ? 'fill-current' : ''}`} 
        />
      </Button>
      <span className="text-white text-xs mt-1 font-medium">
        {isSaved ? 'Sauvé' : 'Sauver'}
      </span>
    </div>
  );
};

export default VideoFavoris;