/**
 * Composant Video avec logique offline-first
 * Affiche toujours depuis le stockage local, jamais directement depuis Supabase
 */

import React from 'react';
import { Download, CloudOff, Loader2, PlayCircle } from 'lucide-react';
import { useOfflineMedia } from '../hooks/useOfflineMedia';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface OfflineVideoProps {
  /** URL distante de la vidéo (Supabase) */
  src: string | null | undefined;
  /** Classes CSS */
  className?: string;
  /** Télécharger automatiquement */
  autoDownload?: boolean;
  /** Poster/thumbnail */
  poster?: string;
  /** Props supplémentaires pour l'élément video */
  videoProps?: React.VideoHTMLAttributes<HTMLVideoElement>;
  /** Callback après téléchargement */
  onDownloaded?: () => void;
}

export const OfflineVideo: React.FC<OfflineVideoProps> = ({
  src,
  className,
  autoDownload = false,
  poster,
  videoProps,
  onDownloaded,
}) => {
  const {
    displayUrl,
    status,
    progress,
    isLocal,
    download,
  } = useOfflineMedia({
    remoteUrl: src,
    mimeType: 'video/mp4',
    autoDownload,
  });

  React.useEffect(() => {
    if (isLocal && onDownloaded) {
      onDownloaded();
    }
  }, [isLocal, onDownloaded]);

  // ⚡ PRIORITÉ ABSOLUE: Si on a une displayUrl, afficher immédiatement
  // Pas de vérification de status, affichage instantané
  if (displayUrl) {
    return (
      <video
        src={displayUrl}
        poster={poster}
        controls
        className={cn('max-w-full rounded-lg', className)}
        {...videoProps}
      />
    );
  }

  // ⚡ État "checking": vérification locale en cours - afficher skeleton discret
  if (status === 'checking') {
    return (
      <div className={cn('bg-muted/30 rounded-lg aspect-video animate-pulse', className)}>
        <div className="w-full h-full bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50" />
      </div>
    );
  }

  // Téléchargement en cours
  if (status === 'downloading') {
    return (
      <div className={cn('flex flex-col items-center justify-center p-6 bg-muted rounded-lg aspect-video', className)}>
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
        <Progress value={progress} className="w-full h-2 max-w-48" />
        <span className="text-sm text-muted-foreground mt-2">
          Téléchargement... {progress}%
        </span>
      </div>
    );
  }

  // Hors ligne
  if (status === 'offline_unavailable') {
    return (
      <div className={cn('flex flex-col items-center justify-center p-6 bg-muted/50 rounded-lg aspect-video', className)}>
        <CloudOff className="h-10 w-10 text-muted-foreground mb-2" />
        <span className="text-sm text-muted-foreground">
          Vidéo non disponible hors ligne
        </span>
      </div>
    );
  }

  // Non téléchargé - Afficher avec poster ou placeholder
  return (
    <div
      className={cn(
        'relative flex items-center justify-center bg-muted rounded-lg aspect-video overflow-hidden group',
        className
      )}
    >
      {poster ? (
        <img src={poster} alt="" className="w-full h-full object-cover" />
      ) : (
        <PlayCircle className="h-16 w-16 text-muted-foreground" />
      )}

      {/*
        IMPORTANT: téléchargement strictement unitaire
        → seul le bouton "Télécharger la vidéo" déclenche download() (pas le container)
      */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="gap-2"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            download();
          }}
        >
          <Download className="h-5 w-5" />
          Télécharger la vidéo
        </Button>
      </div>
    </div>
  );
};
