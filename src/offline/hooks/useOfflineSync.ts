/**
 * Hook pour gérer la synchronisation offline
 */

import { useState, useEffect } from 'react';
import { syncManager } from '../utils/syncManager';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(syncManager.getOnlineStatus());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = syncManager.onConnectionChange(setIsOnline);
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
