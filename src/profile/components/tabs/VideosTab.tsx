import React, { useState } from 'react';
import { Video, List, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserVideos } from '@/profile/hooks/useUserVideos';
import { useUserSeries } from '@/profile/hooks/useUserSeries';
import { useSeriesVideos } from '@/profile/hooks/useSeriesVideos';
import { useAuth } from '@/hooks/useAuth';
import SeriesCarousel from '@/profile/components/SeriesCarousel';
import SeriesPanel from '@/profile/components/SeriesPanel';
import CreateSeriesDialog from '@/profile/components/CreateSeriesDialog';
import ManageSeriesDialog from '@/profile/components/ManageSeriesDialog';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import VerificationRequiredDialog from '@/verification/components/VerificationRequiredDialog';
import VideoCreationFlowDialog from '@/components/admin/video/VideoCreationFlowDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface VideosTabProps {
  userId?: string;
}

const extractStorageObjectFromPublicUrl = (publicUrl?: string | null) => {
  if (!publicUrl) {
    return null;
  }

  try {
    const pathname = decodeURIComponent(new URL(publicUrl).pathname);
    const marker = '/storage/v1/object/public/';
    const markerIndex = pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const objectPath = pathname.slice(markerIndex + marker.length);
    const [bucket, ...segments] = objectPath.split('/');

    if (!bucket || segments.length === 0) {
      return null;
    }

    return {
      bucket,
      path: segments.join('/'),
    };
  } catch {
    return null;
  }
};

const removeVideoMediaFromStorage = async (urls: Array<string | null | undefined>) => {
  const filesByBucket = new Map<string, Set<string>>();

  urls.forEach((url) => {
    const file = extractStorageObjectFromPublicUrl(url);
    if (!file) {
      return;
    }

    if (!filesByBucket.has(file.bucket)) {
      filesByBucket.set(file.bucket, new Set());
    }

    filesByBucket.get(file.bucket)?.add(file.path);
  });

  await Promise.all(
    Array.from(filesByBucket.entries()).map(async ([bucket, paths]) => {
      const { error } = await supabase.storage.from(bucket).remove(Array.from(paths));

      if (error) {
        throw error;
      }
    })
  );
};

const VideosTab: React.FC<VideosTabProps> = ({ userId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: videos, isLoading, refetch: refetchVideos } = useUserVideos(userId);
  const { data: series, refetch: refetchSeries } = useUserSeries(userId);
  
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [selectedSeriesTitle, setSelectedSeriesTitle] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [manageSeriesId, setManageSeriesId] = useState<string | null>(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [showVideoCreationDialog, setShowVideoCreationDialog] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [isDeletingVideo, setIsDeletingVideo] = useState(false);
  
  const { data: seriesEpisodes, refetch: refetchEpisodes } = useSeriesVideos(manageSeriesId || undefined);
  
  const isOwner = user?.id === userId;

  // Récupérer le profil pour vérifier si l'utilisateur est vérifié
  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Récupérer toutes les associations vidéos-séries
  const { data: videoSeriesMap } = useQuery({
    queryKey: ['video-series-map', userId],
    queryFn: async () => {
      if (!userId) return {};
      
      const { data, error } = await supabase
        .from('series_videos')
        .select('video_id, series_id, series(id, title)')
        .eq('series.user_id', userId);
      
      if (error) throw error;
      
      // Créer un map video_id -> série
      const map: Record<string, { seriesId: string; seriesTitle: string }> = {};
      data?.forEach((item: any) => {
        if (item.series) {
          map[item.video_id] = {
            seriesId: item.series.id,
            seriesTitle: item.series.title,
          };
        }
      });
      return map;
    },
    enabled: !!userId,
  });

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
          Vos vidéos créées apparaîtront ici
        </p>
      </div>
    );
  }

  const handleSelectSeries = (seriesId: string) => {
    const selectedSeries = series?.find(s => s.id === seriesId);
    if (selectedSeries) {
      setSelectedSeriesId(seriesId);
      setSelectedSeriesTitle(selectedSeries.title);
    }
  };

  const handleClosePanel = () => {
    setSelectedSeriesId(null);
    setSelectedSeriesTitle('');
  };

  const handleSeriesCreated = () => {
    refetchSeries();
  };

  const handleManageSeries = (seriesId: string) => {
    setManageSeriesId(seriesId);
  };

  const handleManageSeriesSuccess = () => {
    refetchEpisodes();
    refetchSeries();
  };

  const handleVideoCreationSuccess = () => {
    refetchVideos();
  };

  const handleDeleteVideo = async () => {
    if (!deletingVideoId || !user?.id) {
      return;
    }

    try {
      setIsDeletingVideo(true);

      const videoToDelete = videos?.find((video) => video.id === deletingVideoId);

      const { data, error } = await (supabase as any).rpc('delete_own_video', {
        p_video_id: deletingVideoId,
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.message || 'Suppression refusee');
      }

      try {
        await removeVideoMediaFromStorage([
          data.video_url,
          data.thumbnail_url,
          videoToDelete?.video_url,
          videoToDelete?.thumbnail_url,
        ]);
      } catch (storageError) {
        console.error('Erreur suppression storage video:', storageError);
      }

      toast.success('Vidéo supprimée');
      setDeletingVideoId(null);
      refetchVideos();
      refetchSeries();
      refetchEpisodes();
    } catch (error: any) {
      console.error('Erreur suppression vidéo:', error);

      if (error?.code === 'PGRST202') {
        toast.error('La fonction SQL delete_own_video est absente. Il faut d abord appliquer le script Supabase de suppression.');
      } else if (error?.code === '42501') {
        toast.error('La base refuse actuellement cette suppression. La policy ou la fonction SQL cote Supabase doit etre corrigee.');
      } else {
        toast.error('Erreur lors de la suppression de la vidéo');
      }
    } finally {
      setIsDeletingVideo(false);
    }
  };

  return (
    <>
      <div className="pb-4">
        {/* Bouton Créer une vidéo - pour tous les utilisateurs propriétaires */}
        {isOwner && (
          <div className="px-4 pt-4 pb-2">
            <Button
              onClick={() => {
                // Si non vérifié, afficher le dialog
                if (!(profile as any)?.is_verified) {
                  setShowVerificationDialog(true);
                  return;
                }
                navigate('/upload-video');
              }}
              className="w-full bg-edu-primary hover:bg-edu-primary/90 text-white"
            >
              <Plus size={20} className="mr-2" />
              Créer une vidéo
            </Button>
          </div>
        )}

        {/* Section Séries */}
        {series && series.length > 0 && (
          <SeriesCarousel
            series={series}
            isOwner={isOwner}
            onCreateSeries={() => setShowCreateDialog(true)}
            onSelectSeries={handleSelectSeries}
          />
        )}

        {/* Si pas de séries mais utilisateur est propriétaire */}
        {(!series || series.length === 0) && isOwner && videos && videos.length > 0 && (
          <div className="mb-6 px-4">
            <Button
              onClick={() => setShowCreateDialog(true)}
              variant="outline"
              className="w-full border-dashed"
            >
              Créer votre première série
            </Button>
          </div>
        )}

        {/* Grille de vidéos */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 px-4">
          {videos?.map((video) => {
            const videoSeries = videoSeriesMap?.[video.id];
            
            return (
              <div
                key={video.id}
                className="relative aspect-video bg-muted rounded-lg overflow-hidden group"
              >
                <div onClick={() => navigate(`/video/${video.id}`)} className="w-full h-full cursor-pointer hover:opacity-90 transition-opacity">
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

                {/* Badge série si la vidéo fait partie d'une série */}
                {videoSeries && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectSeries(videoSeries.seriesId);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-background/90 backdrop-blur-sm rounded-md hover:bg-background transition-colors"
                    title={`Série: ${videoSeries.seriesTitle}`}
                  >
                    <List size={16} />
                  </button>
                )}

                {isOwner && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingVideoId(video.id);
                    }}
                    className="absolute top-2 left-2 p-1.5 bg-destructive/90 text-white backdrop-blur-sm rounded-md hover:bg-destructive transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    title="Supprimer la vidéo"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel latéral pour les séries */}
      {selectedSeriesId && (
        <SeriesPanel
          seriesId={selectedSeriesId}
          seriesTitle={selectedSeriesTitle}
          onClose={handleClosePanel}
          isOwner={isOwner}
          onManageSeries={isOwner ? () => handleManageSeries(selectedSeriesId) : undefined}
        />
      )}

      {/* Dialog de création de série */}
      {userId && (
        <CreateSeriesDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          userId={userId}
          onSuccess={handleSeriesCreated}
        />
      )}

      {/* Dialog de gestion des épisodes */}
      {manageSeriesId && userId && videos && (
        <ManageSeriesDialog
          open={!!manageSeriesId}
          onOpenChange={(open) => !open && setManageSeriesId(null)}
          seriesId={manageSeriesId}
          seriesTitle={series?.find(s => s.id === manageSeriesId)?.title || ''}
          userVideos={videos}
          currentEpisodes={seriesEpisodes || []}
          onSuccess={handleManageSeriesSuccess}
        />
      )}

      {/* Dialog de vérification requis */}
      <VerificationRequiredDialog
        open={showVerificationDialog}
        onOpenChange={setShowVerificationDialog}
        featureName="La création de vidéos"
      />

      <VideoCreationFlowDialog
        open={showVideoCreationDialog}
        onOpenChange={setShowVideoCreationDialog}
        onSuccess={handleVideoCreationSuccess}
      />

      <AlertDialog open={!!deletingVideoId} onOpenChange={(open) => !open && setDeletingVideoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la vidéo</AlertDialogTitle>
            <AlertDialogDescription>
              Cette vidéo, ses liens de série et ses interactions associées seront supprimés définitivement. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingVideo}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVideo}
              disabled={isDeletingVideo}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingVideo ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default VideosTab;
