/**
 * Dialogue de gestion des vidéos d'une série
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GripVertical, Trash2 } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  thumbnail_url?: string;
}

interface ManageSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesId: string;
  seriesTitle: string;
  userVideos: Video[];
  currentEpisodes: any[];
  onSuccess: () => void;
}

const ManageSeriesDialog: React.FC<ManageSeriesDialogProps> = ({
  open,
  onOpenChange,
  seriesId,
  seriesTitle,
  userVideos,
  currentEpisodes,
  onSuccess,
}) => {
  const [selectedVideos, setSelectedVideos] = useState<string[]>(
    currentEpisodes.map(ep => ep.video_id)
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleVideo = (videoId: string) => {
    setSelectedVideos(prev =>
      prev.includes(videoId)
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId]
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Supprimer toutes les vidéos actuelles de la série
      await supabase
        .from('series_videos')
        .delete()
        .eq('series_id', seriesId);

      // Ajouter les nouvelles vidéos sélectionnées
      if (selectedVideos.length > 0) {
        const seriesVideos = selectedVideos.map((videoId, index) => ({
          series_id: seriesId,
          video_id: videoId,
          order_index: index,
        }));

        const { error } = await supabase
          .from('series_videos')
          .insert(seriesVideos);

        if (error) throw error;
      }

      toast.success('Série mise à jour avec succès');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating series:', error);
      toast.error('Erreur lors de la mise à jour de la série');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gérer les épisodes - {seriesTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Sélectionnez les vidéos à inclure dans cette série
          </p>

          {userVideos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune vidéo disponible
            </p>
          ) : (
            <div className="space-y-2">
              {userVideos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => handleToggleVideo(video.id)}
                >
                  <Checkbox
                    checked={selectedVideos.includes(video.id)}
                    onCheckedChange={() => handleToggleVideo(video.id)}
                  />
                  
                  <div className="flex-shrink-0 w-24 h-14 bg-muted rounded overflow-hidden">
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{video.title}</p>
                  </div>

                  {selectedVideos.includes(video.id) && (
                    <GripVertical size={16} className="text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageSeriesDialog;
