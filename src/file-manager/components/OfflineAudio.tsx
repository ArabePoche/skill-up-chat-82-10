/**
 * Composant Audio avec logique offline-first
 * Affiche toujours depuis le stockage local, jamais directement depuis Supabase
 */

import React from 'react';
import { Download, CloudOff, Loader2, Volume2 } from 'lucide-react';
import { useOfflineMedia } from '../hooks/useOfflineMedia';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface OfflineAudioProps {
  /** URL distante de l'audio (Supabase) */
  src: string | null | undefined;
  /** Classes CSS du container */
  className?: string;
  /** Télécharger automatiquement */
  autoDownload?: boolean;
  /** Nom du fichier affiché */
  fileName?: string;
  /** Props supplémentaires pour l'élément audio */
  audioProps?: React.AudioHTMLAttributes<HTMLAudioElement>;
  /** Callback après téléchargement */
  onDownloaded?: () => void;
}

export const OfflineAudio: React.FC<OfflineAudioProps> = ({
  src,
  className,
  autoDownload = false,
  fileName,
  audioProps,
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
    mimeType: 'audio/mpeg',
    fileName,
    autoDownload,
  });

  React.useEffect(() => {
    if (isLocal && onDownloaded) {
      onDownloaded();
    }
  }, [isLocal, onDownloaded]);

  // Audio disponible localement
  if (status === 'downloaded' && displayUrl) {
    return (
      <div className={cn('flex items-center gap-3 p-3 bg-muted rounded-lg', className)}>
        <Volume2 className="h-5 w-5 text-primary flex-shrink-0" />
        <audio 
          src={displayUrl} 
          controls 
          className="flex-1 h-8"
          {...audioProps}
        />
      </div>
    );
  }

  // Téléchargement en cours
  if (status === 'downloading') {
    return (
      <div className={cn('flex items-center gap-3 p-3 bg-muted/50 rounded-lg', className)}>
        <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
        <div className="flex-1">
          <Progress value={progress} className="h-1" />
          <span className="text-xs text-muted-foreground">{progress}%</span>
        </div>
      </div>
    );
  }

  // Hors ligne
  if (status === 'offline_unavailable') {
    return (
      <div className={cn('flex items-center gap-3 p-3 bg-muted/50 rounded-lg opacity-60', className)}>
        <CloudOff className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Audio non disponible hors ligne</span>
      </div>
    );
  }

  // Non téléchargé
  return (
    <div 
      className={cn(
        'flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-lg cursor-pointer transition-colors',
        className
      )}
      onClick={download}
    >
      <Volume2 className="h-5 w-5 text-muted-foreground" />
      <span className="flex-1 text-sm text-muted-foreground">
        {fileName || 'Fichier audio'}
      </span>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
};
