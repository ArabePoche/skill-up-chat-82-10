/**
 * Indicateur de statut de connexion
 */

import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const OfflineIndicator = () => {
  const { isOnline, isSyncing, forceSync } = useOfflineSync();

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all",
      isOnline 
        ? "bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400" 
        : "bg-orange-500/10 border border-orange-500/20 text-orange-700 dark:text-orange-400"
    )}>
      {isOnline ? (
        <Wifi className="w-4 h-4" />
      ) : (
        <WifiOff className="w-4 h-4" />
      )}
      
      <span className="text-sm font-medium">
        {isOnline ? 'En ligne' : 'Hors ligne'}
      </span>

      {isOnline && (
        <Button
          size="sm"
          variant="ghost"
          onClick={forceSync}
          disabled={isSyncing}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin")} />
        </Button>
      )}
    </div>
  );
};
