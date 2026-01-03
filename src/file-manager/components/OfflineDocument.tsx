/**
 * Composant Document avec logique offline-first
 * Pour PDFs, Word, Excel et autres documents
 */

import React from 'react';
import { Download, CloudOff, Loader2, FileText, FileSpreadsheet, File, ExternalLink } from 'lucide-react';
import { useOfflineMedia } from '../hooks/useOfflineMedia';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface OfflineDocumentProps {
  /** URL distante du document (Supabase) */
  src: string | null | undefined;
  /** Nom du fichier */
  fileName: string;
  /** Type MIME */
  mimeType?: string;
  /** Taille du fichier en bytes */
  fileSize?: number;
  /** Classes CSS */
  className?: string;
  /** Télécharger automatiquement */
  autoDownload?: boolean;
  /** Callback après téléchargement */
  onDownloaded?: () => void;
}

const getDocumentIcon = (mimeType: string) => {
  if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="h-8 w-8 text-blue-500" />;
  return <File className="h-8 w-8 text-muted-foreground" />;
};

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const OfflineDocument: React.FC<OfflineDocumentProps> = ({
  src,
  fileName,
  mimeType = 'application/octet-stream',
  fileSize,
  className,
  autoDownload = false,
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
    mimeType,
    fileName,
    autoDownload,
  });

  React.useEffect(() => {
    if (isLocal && onDownloaded) {
      onDownloaded();
    }
  }, [isLocal, onDownloaded]);

  const icon = getDocumentIcon(mimeType);
  const sizeText = fileSize ? formatFileSize(fileSize) : null;

  // Document disponible localement
  if (status === 'downloaded' && displayUrl) {
    return (
      <a
        href={displayUrl}
        download={fileName}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'flex items-center gap-3 p-3 bg-muted hover:bg-muted/80 rounded-lg transition-colors',
          className
        )}
      >
        {icon}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          {sizeText && <p className="text-xs text-muted-foreground">{sizeText}</p>}
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      </a>
    );
  }

  // Téléchargement en cours
  if (status === 'downloading') {
    return (
      <div className={cn('flex items-center gap-3 p-3 bg-muted/50 rounded-lg', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <Progress value={progress} className="h-1 mt-1" />
          <p className="text-xs text-muted-foreground mt-1">{progress}%</p>
        </div>
      </div>
    );
  }

  // Hors ligne
  if (status === 'offline_unavailable') {
    return (
      <div className={cn('flex items-center gap-3 p-3 bg-muted/50 rounded-lg opacity-60', className)}>
        <CloudOff className="h-8 w-8 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs text-muted-foreground">Non disponible hors ligne</p>
        </div>
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
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileName}</p>
        {sizeText && <p className="text-xs text-muted-foreground">{sizeText}</p>}
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
};
