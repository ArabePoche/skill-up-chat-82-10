/**
 * Hook pour monitorer l'état offline-first de l'application
 * Fournit des statistiques et indicateurs pour l'UI
 */

import { useState, useEffect } from 'react';
import { syncManager } from '../utils/syncManager';
import { offlineStore } from '../utils/offlineStore';

interface OfflineStats {
  isOnline: boolean;
  storageUsage: {
    used: number;
    quota: number;
    percentage: number;
  };
  syncStats: {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    lastSyncTime: number | null;
    consecutiveFailures: number;
  };
  pendingMutations: number;
  offlineFormations: number;
}

export const useOfflineStats = () => {
  const [stats, setStats] = useState<OfflineStats>({
    isOnline: true,
    storageUsage: { used: 0, quota: 0, percentage: 0 },
    syncStats: {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastSyncTime: null,
      consecutiveFailures: 0,
    },
    pendingMutations: 0,
    offlineFormations: 0,
  });

  const [loading, setLoading] = useState(true);

  const refreshStats = async () => {
    try {
      const [isOnline, storageUsage, syncStats, pendingMutations, offlineFormations] = await Promise.all([
        Promise.resolve(syncManager.getOnlineStatus()),
        offlineStore.getStorageUsage(),
        Promise.resolve(syncManager.getSyncStats()),
        offlineStore.getPendingMutations().then(m => m.length),
        offlineStore.getAllFormations().then(f => f.length),
      ]);

      setStats({
        isOnline,
        storageUsage,
        syncStats,
        pendingMutations,
        offlineFormations,
      });
    } catch (error) {
      console.error('Error fetching offline stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStats();

    // Écouter les changements de connexion
    const unsubscribe = syncManager.onConnectionChange(() => {
      setStats(prev => ({ ...prev, isOnline: syncManager.getOnlineStatus() }));
      refreshStats();
    });

    // Rafraîchir les stats toutes les 30 secondes
    const interval = setInterval(refreshStats, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getLastSyncTime = () => {
    if (!stats.syncStats.lastSyncTime) return null;
    const diff = Date.now() - stats.syncStats.lastSyncTime;
    if (diff < 60000) return 'À l\'instant';
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`;
    return `Il y a ${Math.floor(diff / 86400000)} j`;
  };

  return {
    stats,
    loading,
    refreshStats,
    formatBytes,
    getLastSyncTime,
  };
};
