/**
 * Modal de téléchargement de vidéo avec watermark
 * Ouvert via un appui long sur la vidéo (style TikTok)
 */

import React, { useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { downloadVideoWithWatermark } from '@/watermark';
import { useTranslation } from 'react-i18next';

interface VideoDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  videoTitle: string;
  authorName: string;
}

const VideoDownloadModal: React.FC<VideoDownloadModalProps> = ({
  isOpen,
  onClose,
  videoUrl,
  videoTitle,
  authorName,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadStage, setDownloadStage] = useState('');
  const { t } = useTranslation();

  const handleDownload = async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    setProgress(0);
    setDownloadStage('Préparation du téléchargement');

    try {
      toast.info('Préparation du téléchargement sécurisé...');
      await downloadVideoWithWatermark({
        videoUrl,
        watermarkText: 'REZO',
        authorName,
        fileName: `${videoTitle.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`,
        onProgress: (p) => setProgress(p),
        onStageChange: (stage) => setDownloadStage(stage),
      });

      toast.success('Vidéo téléchargée avec succès !');
      onClose();
    } catch (error: unknown) {
      console.error('Erreur téléchargement vidéo:', error);
      const message = error instanceof Error
        ? error.message
        : 'Impossible de télécharger cette vidéo avec watermark';
      toast.error(message);
    } finally {
      setIsDownloading(false);
      setProgress(0);
      setDownloadStage('');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-center text-lg">
            Télécharger la vidéo
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Aperçu */}
          <div className="bg-muted rounded-xl p-4">
            <p className="text-sm font-medium text-foreground line-clamp-2">
              {videoTitle}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              @{authorName}
            </p>
          </div>

          {/* Info watermark */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <span className="text-base">©</span>
            <span>
              Respectez les droits d'auteur et la propriété intellectuelle lors du partage de ce contenu.
            </span>
          </div>

          {/* Bouton téléchargement */}
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full h-12 text-base gap-2 rounded-xl"
            size="lg"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {downloadStage || 'Téléchargement...'} {progress > 0 ? `${progress}%` : ''}
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Enregistrer la vidéo
              </>
            )}
          </Button>

          {/* Barre de progression */}
          {isDownloading && progress > 0 && (
            <div className="space-y-2">
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {downloadStage && (
                <p className="text-xs text-muted-foreground text-center">
                  {downloadStage}
                </p>
              )}
            </div>
          )}

          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full text-muted-foreground"
            disabled={isDownloading}
          >
            Annuler
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default VideoDownloadModal;
