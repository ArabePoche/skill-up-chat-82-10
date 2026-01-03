/**
 * Composant Image avec logique offline-first
 * Affiche toujours depuis le stockage local, jamais directement depuis Supabase
 * 
 * ARCHITECTURE:
 * 📌 Supabase = source de téléchargement initial
 * 📌 Stockage local = source d'affichage
 */

import React from 'react';
import { Download, CloudOff, Loader2, ImageOff } from 'lucide-react';
import { useOfflineMedia } from '../hooks/useOfflineMedia';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface OfflineImageProps {
  /** URL distante de l'image (Supabase) */
  src: string | null | undefined;
  /** Texte alternatif */
  alt?: string;
  /** Classes CSS */
  className?: string;
  /** Télécharger automatiquement */
  autoDownload?: boolean;
  /** Placeholder pendant le chargement */
  placeholder?: React.ReactNode;
  /** Afficher le bouton de téléchargement si non local */
  showDownloadButton?: boolean;
  /** Callback après téléchargement réussi */
  onDownloaded?: () => void;
  /** Props supplémentaires pour l'image */
  imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;
}

export const OfflineImage: React.FC<OfflineImageProps> = ({
  src,
  alt = '',
  className,
  autoDownload = false,
  placeholder,
  showDownloadButton = true,
  onDownloaded,
  imgProps,
}) => {
  const {
    displayUrl,
    status,
    progress,
    isLocal,
    download,
  } = useOfflineMedia({
    remoteUrl: src,
    mimeType: 'image/jpeg',
    autoDownload,
  });

  // Callback quand téléchargé
  React.useEffect(() => {
    if (isLocal && onDownloaded) {
      onDownloaded();
    }
  }, [isLocal, onDownloaded]);

  // ⚡ PRIORITÉ ABSOLUE: Si on a une displayUrl, afficher immédiatement
  // Pas de conditions intermédiaires, pas d'attente
  if (displayUrl) {
    return (
      <img
        src={displayUrl}
        alt={alt}
        className={cn('max-w-full', className)}
        loading="lazy"
        {...imgProps}
      />
    );
  }

  // ⚡ État "checking": vérification locale en cours - afficher skeleton discret
  // PAS de bouton télécharger pendant cette phase ultra-rapide
  if (status === 'checking') {
    return (
      <div className={cn('bg-muted/30 rounded-lg animate-pulse', className)} style={{ minHeight: 100 }}>
        <div className="w-full h-full bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 animate-shimmer" />
      </div>
    );
  }

  // Téléchargement en cours
  if (status === 'downloading') {
    return (
      <div className={cn('flex flex-col items-center justify-center p-4 bg-muted rounded-lg', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <Progress value={progress} className="w-full h-1 max-w-32" />
        <span className="text-xs text-muted-foreground mt-1">{progress}%</span>
      </div>
    );
  }

  // Hors ligne et non disponible
  if (status === 'offline_unavailable') {
    return (
      <div className={cn('flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg', className)}>
        <CloudOff className="h-8 w-8 text-muted-foreground mb-2" />
        <span className="text-xs text-muted-foreground text-center">
          Hors connexion
        </span>
      </div>
    );
  }

  // Erreur
  if (status === 'error') {
    return (
      <div className={cn('flex flex-col items-center justify-center p-4 bg-destructive/10 rounded-lg', className)}>
        <ImageOff className="h-8 w-8 text-destructive mb-2" />
        <span className="text-xs text-destructive">Erreur de chargement</span>
        {showDownloadButton && (
          <Button variant="ghost" size="sm" onClick={download} className="mt-2">
            Réessayer
          </Button>
        )}
      </div>
    );
  }

  // Non téléchargé - Afficher placeholder ou bouton
  if (placeholder) {
    return (
      <div className={cn('relative', className)}>
        {placeholder}
        {showDownloadButton && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
            {/*
              IMPORTANT: téléchargement strictement unitaire
              → seul le bouton déclenche download() (pas le container)
            */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                download();
              }}
            >
              <Download className="h-4 w-4" />
              Télécharger
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg', className)}>
      <Download className="h-8 w-8 text-muted-foreground mb-2" />

      {showDownloadButton && (
        <>
          <span className="text-xs text-muted-foreground">Non téléchargé</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              download();
            }}
          >
            Télécharger
          </Button>
        </>
      )}
    </div>
  );
};
