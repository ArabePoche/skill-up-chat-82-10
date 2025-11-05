/**
 * Hook pour lister toutes les formations disponibles offline
 */

import { useState, useEffect } from 'react';
import { offlineStore } from '../utils/offlineStore';
import { useOfflineSync } from './useOfflineSync';

export const useOfflineFormations = () => {
  const [offlineFormations, setOfflineFormations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isOnline } = useOfflineSync();

  useEffect(() => {
    const loadOfflineFormations = async () => {
      setIsLoading(true);
      try {
        const formations = await offlineStore.getAllFormations();
        setOfflineFormations(formations);
      } catch (error) {
        console.error('Error loading offline formations:', error);
        setOfflineFormations([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadOfflineFormations();
  }, [isOnline]);

  return {
    offlineFormations,
    isLoading,
    hasOfflineFormations: offlineFormations.length > 0,
  };
};
