import React from 'react';
import { Video } from 'lucide-react';

interface VideosTabProps {
  userId?: string;
}

const VideosTab: React.FC<VideosTabProps> = ({ userId }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Video size={32} className="text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Aucune vidéo</h3>
      <p className="text-sm text-muted-foreground">
        Vos vidéos partagées apparaîtront ici
      </p>
    </div>
  );
};

export default VideosTab;
