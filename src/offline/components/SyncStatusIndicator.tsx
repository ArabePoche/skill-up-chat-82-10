/**
 * Indicateur visuel du statut de synchronisation
 * Affiche le nombre de mutations en attente et le progrès de la sync
 */

import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSyncPendingMutations } from '../hooks/useOfflineMutation';
import { cn } from '@/lib/utils';

interface SyncStatusIndicatorProps {
  className?: string;
  compact?: boolean;
}

export function SyncStatusIndicator({ className, compact = false }: SyncStatusIndicatorProps) {
  const { isSyncing, pendingCount, syncProgress, syncAllPending, isOnline } = useSyncPendingMutations();

  // Ne rien afficher si tout est synchronisé et online
  if (isOnline && pendingCount === 0 && !isSyncing) {
    if (compact) return null;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-1 text-green-600", className)}>
              <Check className="h-4 w-4" />
              {!compact && <span className="text-xs">Synchronisé</span>}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Toutes les données sont synchronisées</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Affichage de la synchronisation en cours
  if (isSyncing) {
    const progressPercent = syncProgress.total > 0 
      ? (syncProgress.current / syncProgress.total) * 100 
      : 0;

    return (
      <div className={cn("flex items-center gap-2", className)}>
        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
        {!compact && (
          <div className="flex flex-col gap-1 min-w-[120px]">
            <span className="text-xs text-muted-foreground">
              Synchronisation {syncProgress.current}/{syncProgress.total}
            </span>
            <Progress value={progressPercent} className="h-1" />
          </div>
        )}
      </div>
    );
  }

  // Mode offline avec mutations en attente
  if (!isOnline && pendingCount > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-2", className)}>
              <CloudOff className="h-4 w-4 text-orange-500" />
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                {pendingCount} en attente
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{pendingCount} modification(s) seront synchronisées au retour de la connexion</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Mode online avec mutations en attente (cas rare, après erreur)
  if (isOnline && pendingCount > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncAllPending()}
              className={cn("flex items-center gap-2 text-orange-600 border-orange-300", className)}
            >
              <AlertCircle className="h-4 w-4" />
              {!compact && <span className="text-xs">{pendingCount} en attente</span>}
              <RefreshCw className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Cliquez pour synchroniser {pendingCount} modification(s)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Mode offline sans mutations
  if (!isOnline) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-1 text-gray-500", className)}>
              <CloudOff className="h-4 w-4" />
              {!compact && <span className="text-xs">Hors ligne</span>}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Mode hors ligne - Les modifications seront synchronisées au retour de la connexion</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
}
