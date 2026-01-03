/**
 * Composant indicateur de l'espace de stockage utilisé
 * Affiche les statistiques et permet le nettoyage
 */

import React from 'react';
import { HardDrive, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useFileStorageManager } from '../hooks/useFileStorageManager';
import { cn } from '@/lib/utils';

interface FileStorageIndicatorProps {
  className?: string;
  compact?: boolean;
}

export const FileStorageIndicator: React.FC<FileStorageIndicatorProps> = ({
  className,
  compact = false,
}) => {
  const {
    stats,
    isLoading,
    isCleaning,
    config,
    cleanupOldFiles,
    formatSize,
    usedPercentage,
  } = useFileStorageManager();

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        {!compact && <span className="text-xs">Chargement...</span>}
      </div>
    );
  }

  if (!stats) return null;

  const usedSize = formatSize(stats.totalSizeBytes);
  const maxSize = `${config.maxStorageMB} MB`;
  const isAlmostFull = usedPercentage > 80;

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-8 w-8",
              isAlmostFull && "text-warning",
              className
            )}
          >
            <HardDrive className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <StorageDetails
            stats={stats}
            usedSize={usedSize}
            maxSize={maxSize}
            usedPercentage={usedPercentage}
            isAlmostFull={isAlmostFull}
            isCleaning={isCleaning}
            onCleanup={cleanupOldFiles}
            formatSize={formatSize}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className={cn("p-3 bg-muted/50 rounded-lg", className)}>
      <StorageDetails
        stats={stats}
        usedSize={usedSize}
        maxSize={maxSize}
        usedPercentage={usedPercentage}
        isAlmostFull={isAlmostFull}
        isCleaning={isCleaning}
        onCleanup={cleanupOldFiles}
        formatSize={formatSize}
      />
    </div>
  );
};

interface StorageDetailsProps {
  stats: { totalFiles: number; totalSizeBytes: number };
  usedSize: string;
  maxSize: string;
  usedPercentage: number;
  isAlmostFull: boolean;
  isCleaning: boolean;
  onCleanup: () => Promise<number>;
  formatSize: (bytes: number) => string;
}

const StorageDetails: React.FC<StorageDetailsProps> = ({
  stats,
  usedSize,
  maxSize,
  usedPercentage,
  isAlmostFull,
  isCleaning,
  onCleanup,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Stockage local</span>
        </div>
        <span className={cn(
          "text-xs",
          isAlmostFull ? "text-warning" : "text-muted-foreground"
        )}>
          {usedPercentage}%
        </span>
      </div>

      <Progress 
        value={usedPercentage} 
        className={cn("h-2", isAlmostFull && "[&>div]:bg-warning")}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{usedSize} / {maxSize}</span>
        <span>{stats.totalFiles} fichiers</span>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={onCleanup}
        disabled={isCleaning || stats.totalFiles === 0}
      >
        {isCleaning ? (
          <>
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            Nettoyage...
          </>
        ) : (
          <>
            <Trash2 className="h-3 w-3 mr-2" />
            Nettoyer les anciens fichiers
          </>
        )}
      </Button>

      {isAlmostFull && (
        <p className="text-xs text-warning">
          Espace de stockage presque plein. Pensez à nettoyer les anciens fichiers.
        </p>
      )}
    </div>
  );
};
