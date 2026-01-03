/**
 * Hook pour gérer le stockage global des fichiers
 * Statistiques, nettoyage, configuration
 */

import { useState, useEffect, useCallback } from 'react';
import { fileStore } from '../stores/FileStore';
import { FileStorageStats, FileManagerConfig, DEFAULT_FILE_MANAGER_CONFIG } from '../types';

export const useFileStorageManager = (config: Partial<FileManagerConfig> = {}) => {
  const [stats, setStats] = useState<FileStorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);

  const fullConfig: FileManagerConfig = {
    ...DEFAULT_FILE_MANAGER_CONFIG,
    ...config,
  };

  /**
   * Charge les statistiques de stockage
   */
  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const storageStats = await fileStore.getStats();
      setStats(storageStats);
    } catch (error) {
      console.error('❌ Error loading file storage stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Nettoie les fichiers anciens
   */
  const cleanupOldFiles = useCallback(async () => {
    setIsCleaning(true);
    try {
      const deletedCount = await fileStore.cleanupOldFiles(fullConfig.autoCleanupDays);
      console.log(`🧹 Cleaned up ${deletedCount} old files`);
      await loadStats();
      return deletedCount;
    } catch (error) {
      console.error('❌ Error cleaning up files:', error);
      return 0;
    } finally {
      setIsCleaning(false);
    }
  }, [fullConfig.autoCleanupDays, loadStats]);

  /**
   * Vérifie si l'espace de stockage est suffisant
   */
  const hasEnoughSpace = useCallback((requiredBytes: number): boolean => {
    if (!stats) return true;
    const maxBytes = fullConfig.maxStorageMB * 1024 * 1024;
    return (stats.totalSizeBytes + requiredBytes) <= maxBytes;
  }, [stats, fullConfig.maxStorageMB]);

  /**
   * Formate la taille en unités lisibles
   */
  const formatSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }, []);

  // Charger les stats au montage
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Nettoyage automatique périodique (une fois par heure)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (stats && stats.totalSizeBytes > fullConfig.maxStorageMB * 1024 * 1024 * 0.9) {
        // Si on dépasse 90% de l'espace max, nettoyer
        cleanupOldFiles();
      }
    }, 60 * 60 * 1000); // 1 heure

    return () => clearInterval(cleanupInterval);
  }, [stats, fullConfig.maxStorageMB, cleanupOldFiles]);

  return {
    stats,
    isLoading,
    isCleaning,
    config: fullConfig,
    loadStats,
    cleanupOldFiles,
    hasEnoughSpace,
    formatSize,
    usedPercentage: stats 
      ? Math.round((stats.totalSizeBytes / (fullConfig.maxStorageMB * 1024 * 1024)) * 100) 
      : 0,
  };
};
