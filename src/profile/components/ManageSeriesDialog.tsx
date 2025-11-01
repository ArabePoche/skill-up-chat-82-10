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
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Video {
  id: string;
  title: string;
  thumbnail_url?: string;
}

interface SortableVideoItemProps {
  video: Video;
  index: number;
  onRemove: () => void;
}

const SortableVideoItem: React.FC<SortableVideoItemProps> = ({ video, index, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical size={20} className="text-muted-foreground" />
      </div>

      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
        {index + 1}
      </div>

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

      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );
};

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
  const { t } = useTranslation();
  const [selectedVideos, setSelectedVideos] = useState<string[]>(
    currentEpisodes.map(ep => ep.video_id)
  );
  const [isLoading, setIsLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const selectedVideoObjects = selectedVideos
    .map(id => userVideos.find(v => v.id === id))
    .filter((v): v is Video => v !== undefined);

  const unselectedVideos = userVideos.filter(v => !selectedVideos.includes(v.id));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedVideos((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddVideo = (videoId: string) => {
    setSelectedVideos(prev => [...prev, videoId]);
  };

  const handleRemoveVideo = (videoId: string) => {
    setSelectedVideos(prev => prev.filter(id => id !== videoId));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await supabase
        .from('series_videos')
        .delete()
        .eq('series_id', seriesId);

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

      toast.success(t('video.seriesUpdated'));
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating series:', error);
      toast.error(t('video.seriesUpdateError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('video.manageEpisodes')} - {seriesTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Section des épisodes sélectionnés (avec drag and drop) */}
          {selectedVideoObjects.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                {t('video.seriesEpisodes')} ({selectedVideoObjects.length})
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                {t('video.dragToReorder')}
              </p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={selectedVideos}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {selectedVideoObjects.map((video, index) => (
                      <SortableVideoItem
                        key={video.id}
                        video={video}
                        index={index}
                        onRemove={() => handleRemoveVideo(video.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Section des vidéos disponibles */}
          {unselectedVideos.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                {t('video.availableVideos')} ({unselectedVideos.length})
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                {t('video.clickToAdd')}
              </p>
              <div className="space-y-2">
                {unselectedVideos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => handleAddVideo(video.id)}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted cursor-pointer transition-colors"
                  >
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {userVideos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('video.noVideosAvailable')}
            </p>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? t('video.saving') : t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageSeriesDialog;
