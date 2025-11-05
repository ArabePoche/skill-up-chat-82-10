/**
 * Hook pour gérer la synchronisation offline
 */

import { useState, useEffect } from 'react';
import { syncManager } from '../utils/syncManager';
import { toast } from '@/hooks/use-toast';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(syncManager.getOnlineStatus());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = syncManager.onConnectionChange((online) => {
      setIsOnline(online);
      if (online) {
        toast({
          title: "Connexion rétablie",
          description: "Synchronisation en cours...",
        });
      } else {
        toast({
          title: "Connexion perdue",
          description: "Mode hors ligne activé",
          variant: "destructive",
        });
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const forceSync = async () => {
    setIsSyncing(true);
    try {
      await syncManager.forceSync();
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isOnline,
    isSyncing,
    forceSync,
  };
};
