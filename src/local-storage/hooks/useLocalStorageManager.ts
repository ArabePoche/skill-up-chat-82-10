/**
 * Hook pour gérer le stockage local (statistiques, nettoyage, etc.)
 */

import { useState, useEffect, useCallback } from 'react';
import { formationStore } from '../stores/FormationStore';
import { messageStore } from '../stores/MessageStore';
import { StorageStats, StorageConfig, DEFAULT_STORAGE_CONFIG } from '../types';

interface UseStorageManagerReturn {
  stats: StorageStats | null;
  isLoading: boolean;
  config: StorageConfig;
  updateConfig: (config: Partial<StorageConfig>) => void;
  cleanupOldData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  refreshStats: () => Promise<void>;
  formatSize: (bytes: number) => string;
}

export const useStorageManager = (): UseStorageManagerReturn => {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<StorageConfig>(DEFAULT_STORAGE_CONFIG);

  // Formate la taille en format lisible
  const formatSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Récupère les statistiques de stockage
  const refreshStats = useCallback(async () => {
    setIsLoading(true);
    try {
      // Récupérer les tailles depuis navigator.storage
      let totalSize = 0;
      if (navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        totalSize = estimate.usage || 0;
      }

      // Compter les éléments
      const [formationsCount, messagesCount, conversationsCount, pendingCount] = await Promise.all([
        formationStore.getAllFormations().then(f => f.length),
        messageStore.getMessageCount(),
        messageStore.getAllConversations().then(c => c.length),
        messageStore.getPendingMessages().then(p => p.length),
      ]);

      setStats({
        totalSize,
        formationsCount,
        messagesCount,
        conversationsCount,
        pendingSyncCount: pendingCount,
        lastCleanupAt: Date.now(),
      });
    } catch (error) {
      console.error('Error getting storage stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Met à jour la config
  const updateConfig = useCallback((newConfig: Partial<StorageConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    // Sauvegarder dans localStorage
    localStorage.setItem('storage_config', JSON.stringify({ ...config, ...newConfig }));
  }, [config]);

  // Nettoie les anciennes données
  const cleanupOldData = useCallback(async () => {
    try {
      console.log('🧹 Starting cleanup...');
      
      // Nettoyer les messages anciens
      const deletedMessages = await messageStore.cleanOldMessages(config.messageRetentionDays);
      
      // Nettoyer les médias anciens
      const deletedMedia = await formationStore.cleanOldMedia(config.maxCacheAgeDays);
      
      console.log(`✅ Cleanup complete: ${deletedMessages} messages, ${deletedMedia} media files`);
      
      // Rafraîchir les stats
      await refreshStats();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }, [config.messageRetentionDays, config.maxCacheAgeDays, refreshStats]);

  // Supprime toutes les données
  const clearAllData = useCallback(async () => {
    try {
      await Promise.all([
        formationStore.clearAll(),
        messageStore.clearAll(),
      ]);
      console.log('🗑️ All local data cleared');
      await refreshStats();
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }, [refreshStats]);

  // Charger la config au démarrage
  useEffect(() => {
    const savedConfig = localStorage.getItem('storage_config');
    if (savedConfig) {
      try {
        setConfig({ ...DEFAULT_STORAGE_CONFIG, ...JSON.parse(savedConfig) });
      } catch (e) {
        console.error('Error loading storage config:', e);
      }
    }
    refreshStats();
  }, [refreshStats]);

  // Nettoyage automatique périodique
  useEffect(() => {
    const cleanup = setInterval(() => {
      cleanupOldData();
    }, 1000 * 60 * 60 * 24); // Toutes les 24h

    return () => clearInterval(cleanup);
  }, [cleanupOldData]);

  return {
    stats,
    isLoading,
    config,
    updateConfig,
    cleanupOldData,
    clearAllData,
    refreshStats,
    formatSize,
  };
};
