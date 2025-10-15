/**
 * Panel latéral affichant les détails d'une série et ses épisodes
 */
import React from 'react';
import { X, Play, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSeriesVideos } from '@/profile/hooks/useSeriesVideos';
import { useNavigate } from 'react-router-dom';

interface SeriesPanelProps {
  seriesId: string;
  seriesTitle: string;
  onClose: () => void;
  isOwner?: boolean;
  onManageSeries?: () => void;
}

const SeriesPanel: React.FC<SeriesPanelProps> = ({
  seriesId,
  seriesTitle,
  onClose,
  isOwner = false,
  onManageSeries,
}) => {
  const navigate = useNavigate();
  const { data: episodes, isLoading } = useSeriesVideos(seriesId);

  const handlePlayVideo = (videoId: string) => {
    navigate(`/video/${videoId}`);
    onClose();
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-background border-l shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{seriesTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {episodes?.length || 0} épisode{episodes && episodes.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && onManageSeries && (
            <Button variant="ghost" size="icon" onClick={onManageSeries}>
              <Settings size={20} />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>
      </div>

      {/* Episodes List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Chargement...</div>
          </div>
        ) : episodes && episodes.length > 0 ? (
          <div className="p-4 space-y-3">
            {episodes.map((episode: any, index: number) => (
              <div
                key={episode.id}
                onClick={() => handlePlayVideo(episode.videos.id)}
                className="flex gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
              >
                {/* Thumbnail */}
                <div className="relative flex-shrink-0 w-32 h-20 bg-muted rounded overflow-hidden">
                  {episode.videos.thumbnail_url ? (
                    <img
                      src={episode.videos.thumbnail_url}
                      alt={episode.videos.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                      <Play size={24} className="text-primary" />
                    </div>
                  )}
                  <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                    {index + 1}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium line-clamp-2 text-sm">
                    {episode.videos.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Épisode {index + 1}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-muted-foreground">
              Aucun épisode dans cette série
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeriesPanel;
