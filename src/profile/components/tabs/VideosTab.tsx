import React, { useState, useMemo } from 'react';
import { Video, List } from 'lucide-react';
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

interface VideosTabProps {
  userId?: string;
}

const VideosTab: React.FC<VideosTabProps> = ({ userId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: videos, isLoading, refetch: refetchVideos } = useUserVideos(userId);
  const { data: series, refetch: refetchSeries } = useUserSeries(userId);
  
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [selectedSeriesTitle, setSelectedSeriesTitle] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [manageSeriesId, setManageSeriesId] = useState<string | null>(null);
  
  const { data: seriesEpisodes, refetch: refetchEpisodes } = useSeriesVideos(manageSeriesId || undefined);
  
  const isOwner = user?.id === userId;

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
          Les vidéos partagées apparaîtront ici
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

  return (
    <>
      <div className="pb-4">
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
    </>
  );
};

export default VideosTab;
