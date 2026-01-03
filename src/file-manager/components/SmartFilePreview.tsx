/**
 * Composant intelligent pour l'affichage de fichiers
 * Logique WhatsApp : bouton télécharger si non local, aperçu si téléchargé
 */

import React from 'react';
import { Download, Cloud, CloudOff, FileIcon, Check, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useFileDownload } from '../hooks/useFileDownload';
import { SmartFilePreviewProps } from '../types';
import { cn } from '@/lib/utils';

/**
 * Détermine l'icône appropriée pour un type de fichier
 */
const getFileIcon = (fileType: string): string => {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎬';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📽️';
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) return '📦';
  return '📎';
};

/**
 * Formate la taille du fichier
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const SmartFilePreview: React.FC<SmartFilePreviewProps> = ({
  fileUrl,
  fileName,
  fileType,
  fileSize = 0,
  ownerId,
  className,
  showFileName = true,
  onDownloadComplete,
  onError,
}) => {
  const {
    status,
    localUrl,
    progress,
    error,
    download,
    deleteLocal,
    isOwnFile,
  } = useFileDownload({
    fileUrl,
    fileName,
    fileType,
    fileSize,
    ownerId,
    autoDownloadOwn: true,
  });

  // Gérer les callbacks
  React.useEffect(() => {
    if (status === 'downloaded' && onDownloadComplete) {
      onDownloadComplete();
    }
  }, [status, onDownloadComplete]);

  React.useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const fileIcon = getFileIcon(fileType);
  const sizeText = formatFileSize(fileSize);
  const isImage = fileType.startsWith('image/');
  const isVideo = fileType.startsWith('video/');
  const isAudio = fileType.startsWith('audio/');

  // État : Téléchargé - Afficher l'aperçu
  if (status === 'downloaded' && localUrl) {
    return (
      <div className={cn("relative group", className)}>
        {isImage && (
          <img 
            src={localUrl} 
            alt={fileName}
            className="max-w-full max-h-64 rounded-lg object-contain"
            loading="lazy"
          />
        )}
        
        {isVideo && (
          <video 
            src={localUrl}
            controls
            className="max-w-full max-h-64 rounded-lg"
          />
        )}
        
        {isAudio && (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <span className="text-2xl">{fileIcon}</span>
            <div className="flex-1 min-w-0">
              {showFileName && (
                <p className="text-sm font-medium truncate">{fileName}</p>
              )}
              <audio src={localUrl} controls className="w-full mt-1" />
            </div>
          </div>
        )}
        
        {!isImage && !isVideo && !isAudio && (
          <a 
            href={localUrl} 
            download={fileName}
            className="flex items-center gap-3 p-3 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            <span className="text-2xl">{fileIcon}</span>
            <div className="flex-1 min-w-0">
              {showFileName && (
                <p className="text-sm font-medium truncate">{fileName}</p>
              )}
              {sizeText && <p className="text-xs text-muted-foreground">{sizeText}</p>}
            </div>
            <Check className="h-4 w-4 text-green-500" />
          </a>
        )}

        {/* Bouton supprimer (visible au hover) - seulement pour les fichiers des autres */}
        {!isOwnFile && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 bg-background/80 hover:bg-destructive/20"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteLocal();
            }}
          >
            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          </Button>
        )}
      </div>
    );
  }

  // État : Téléchargement en cours
  if (status === 'downloading') {
    return (
      <div className={cn("flex items-center gap-3 p-3 bg-muted/50 rounded-lg", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div className="flex-1 min-w-0">
          {showFileName && (
            <p className="text-sm font-medium truncate">{fileName}</p>
          )}
          <Progress value={progress} className="h-1 mt-1" />
          <p className="text-xs text-muted-foreground mt-1">
            Téléchargement... {progress}%
          </p>
        </div>
      </div>
    );
  }

  // État : Erreur
  if (status === 'error') {
    return (
      <div className={cn("flex items-center gap-3 p-3 bg-destructive/10 rounded-lg", className)}>
        <AlertCircle className="h-5 w-5 text-destructive" />
        <div className="flex-1 min-w-0">
          {showFileName && (
            <p className="text-sm font-medium truncate">{fileName}</p>
          )}
          <p className="text-xs text-destructive">
            Erreur de téléchargement
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={download}>
          Réessayer
        </Button>
      </div>
    );
  }

  // État : Hors ligne et non disponible
  if (status === 'offline_unavailable') {
    return (
      <div className={cn("flex items-center gap-3 p-3 bg-muted/50 rounded-lg opacity-60", className)}>
        <CloudOff className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{fileIcon}</span>
            {showFileName && (
              <p className="text-sm font-medium truncate">{fileName}</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Hors connexion - Téléchargement indisponible
          </p>
        </div>
      </div>
    );
  }

  // État : Remote (non téléchargé) - Afficher le bouton télécharger
  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-lg cursor-pointer transition-colors",
        className
      )}
      onClick={download}
    >
      <div className="relative">
        <span className="text-2xl">{fileIcon}</span>
        <Cloud className="absolute -bottom-1 -right-1 h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        {showFileName && (
          <p className="text-sm font-medium truncate">{fileName}</p>
        )}
        {sizeText && <p className="text-xs text-muted-foreground">{sizeText}</p>}
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
};
