/**
 * Bouton de téléchargement de média type WhatsApp
 * Affiche la progression et sauvegarde dans la galerie
 */

import React from 'react';
import { Download, Check, X, Loader2, Image, Video, Music, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useMediaDownload, MediaDownloadResult } from '../hooks/useMediaDownload';
import { getMediaType, MediaType } from '../utils/mediaGallery';

interface MediaDownloadButtonProps {
  /** URL du fichier distant */
  fileUrl: string;
  /** Nom du fichier */
  fileName: string;
  /** Type MIME du fichier */
  mimeType: string;
  /** ID du propriétaire du fichier (optionnel) */
  ownerId?: string;
  /** Variante du bouton */
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  /** Taille du bouton */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Classes CSS additionnelles */
  className?: string;
  /** Afficher le label */
  showLabel?: boolean;
  /** Callback après téléchargement réussi */
  onDownloaded?: (result: MediaDownloadResult) => void;
  /** Le fichier est déjà téléchargé */
  isAlreadyDownloaded?: boolean;
}

const getMediaIcon = (mediaType: MediaType) => {
  switch (mediaType) {
    case 'image': return Image;
    case 'video': return Video;
    case 'audio': return Music;
    default: return File;
  }
};

const getMediaLabel = (mediaType: MediaType): string => {
  switch (mediaType) {
    case 'image': return 'Image';
    case 'video': return 'Vidéo';
    case 'audio': return 'Audio';
    default: return 'Fichier';
  }
};

export const MediaDownloadButton: React.FC<MediaDownloadButtonProps> = ({
  fileUrl,
  fileName,
  mimeType,
  ownerId,
  variant = 'ghost',
  size = 'sm',
  className,
  showLabel = false,
  onDownloaded,
  isAlreadyDownloaded = false,
}) => {
  const [downloaded, setDownloaded] = React.useState(isAlreadyDownloaded);
  
  const { downloadMedia, isDownloading, progress, cancel } = useMediaDownload({
    onSuccess: (result) => {
      setDownloaded(true);
      onDownloaded?.(result);
    },
  });

  const mediaType = getMediaType(mimeType);
  const MediaIcon = getMediaIcon(mediaType);
  const label = getMediaLabel(mediaType);

  const handleClick = async () => {
    if (isDownloading) {
      cancel();
      return;
    }
    
    if (downloaded) {
      // Déjà téléchargé - on peut proposer de retélécharger
      return;
    }

    await downloadMedia(fileUrl, fileName, mimeType, ownerId);
  };

  // Fichier déjà téléchargé
  if (downloaded) {
    return (
      <Button
        variant="ghost"
        size={size}
        className={cn('text-green-600 cursor-default', className)}
        disabled
      >
        <Check size={16} className="mr-1" />
        {showLabel && <span>Téléchargé</span>}
      </Button>
    );
  }

  // Téléchargement en cours
  if (isDownloading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Button
          variant="ghost"
          size={size}
          onClick={cancel}
          className="text-orange-500"
        >
          <X size={16} />
        </Button>
        
        {progress && (
          <div className="flex items-center gap-2 min-w-[100px]">
            <Progress value={progress.percentage} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground w-8">
              {progress.percentage}%
            </span>
          </div>
        )}
        
        {!progress && (
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
        )}
      </div>
    );
  }

  // État par défaut - bouton de téléchargement
  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn('gap-1', className)}
    >
      <Download size={16} />
      {showLabel && <span>Télécharger {label}</span>}
    </Button>
  );
};
