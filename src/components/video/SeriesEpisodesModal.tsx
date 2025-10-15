/**
 * Modal pour afficher les épisodes d'une série vidéo
 */
import React from 'react';
import { X, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';

interface Episode {
  video_id: string;
  order_index: number;
  videos: {
    id: string;
    title: string;
    thumbnail_url: string;
    video_url: string;
  } | null;
}

interface SeriesEpisodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  seriesTitle: string;
  episodes: Episode[];
  currentVideoId?: string;
}

const SeriesEpisodesModal: React.FC<SeriesEpisodesModalProps> = ({
  isOpen,
  onClose,
  seriesTitle,
  episodes,
  currentVideoId,
}) => {
  const navigate = useNavigate();

  const handleEpisodeClick = (videoId: string) => {
    navigate(`/video/${videoId}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        {/* En-tête */}
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold mb-1">
                {seriesTitle}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Tous les {episodes.length} Épisodes
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full"
            >
              <X size={20} />
            </Button>
          </div>
        </DialogHeader>

        {/* Grille d'épisodes */}
        <ScrollArea className="h-[calc(90vh-120px)] p-6">
          <div className="grid grid-cols-3 gap-3">
            {episodes.map((episode) => {
              if (!episode.videos) return null;
              
              const isCurrentVideo = episode.videos.id === currentVideoId;
              const episodeNumber = episode.order_index + 1;

              return (
                <button
                  key={episode.video_id}
                  onClick={() => handleEpisodeClick(episode.videos!.id)}
                  className={`
                    relative aspect-square rounded-lg overflow-hidden
                    transition-all duration-200
                    ${isCurrentVideo 
                      ? 'ring-4 ring-primary scale-105' 
                      : 'hover:scale-105 hover:shadow-lg'
                    }
                  `}
                >
                  {/* Thumbnail ou numéro */}
                  {episode.videos.thumbnail_url ? (
                    <img
                      src={episode.videos.thumbnail_url}
                      alt={`Épisode ${episodeNumber}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <span className="text-3xl font-bold text-primary">
                        {episodeNumber}
                      </span>
                    </div>
                  )}

                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Numéro et titre d'épisode en bas */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white text-xs font-semibold">
                        Épisode {episodeNumber}
                      </span>
                      <span className="text-white/90 text-xs line-clamp-2">
                        {episode.videos.title}
                      </span>
                    </div>
                  </div>

                  {/* Icône play si c'est l'épisode actuel */}
                  {isCurrentVideo && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
                        <Play size={24} className="text-primary-foreground ml-1" fill="currentColor" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SeriesEpisodesModal;
