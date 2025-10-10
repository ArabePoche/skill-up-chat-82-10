import React from 'react';
import { Video, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserVideos } from '@/profile/hooks/useUserVideos';

interface VideosTabProps {
  userId?: string;
}

const VideosTab: React.FC<VideosTabProps> = ({ userId }) => {
  const navigate = useNavigate();
  const { data: videos, isLoading } = useUserVideos(userId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Video size={32} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Aucune vidéo</h3>
        <p className="text-sm text-muted-foreground">
          Les vidéos partagées apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4">
      {videos.map((video) => (
        <div
          key={video.id}
          onClick={() => navigate(`/video/${video.id}`)}
          className="relative aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
        >
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
              <Video size={32} className="text-primary" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <h3 className="text-white text-sm font-medium line-clamp-2">
              {video.title}
            </h3>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VideosTab;
