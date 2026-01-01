/**
 * Hook générique pour les requêtes offline-first
 * Lit d'abord le cache local, puis synchronise en arrière-plan
 */

import { useQuery, UseQueryOptions, UseQueryResult, QueryKey } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { offlineStore } from '../utils/offlineStore';
import { hashQueryKey, shouldPersistQuery, persistQuery } from '../utils/queryPersister';
import { useOfflineSync } from './useOfflineSync';

interface UseOfflineQueryOptions<TData, TError> extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  /** TTL du cache en millisecondes (défaut: 24h) */
  cacheTTL?: number;
  /** Forcer le refresh même si le cache est frais */
  forceRefresh?: boolean;
}

export function useOfflineQuery<TData, TError = Error>(
  options: UseOfflineQueryOptions<TData, TError>
): UseQueryResult<TData, TError> & { isFromCache: boolean } {
  const { queryKey, queryFn, cacheTTL = 1000 * 60 * 60 * 24, forceRefresh = false, ...queryOptions } = options;
  const { isOnline } = useOfflineSync();
  const [isFromCache, setIsFromCache] = useState(false);
  const [initialData, setInitialData] = useState<TData | undefined>(undefined);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // Charger les données du cache au montage
  useEffect(() => {
    const loadCachedData = async () => {
      if (!shouldPersistQuery(queryKey as unknown[])) {
        setInitialDataLoaded(true);
        return;
      }

      try {
        const cachedData = await offlineStore.getCachedQuery(hashQueryKey(queryKey as unknown[]));
        if (cachedData !== null) {
          setInitialData(cachedData as TData);
          setIsFromCache(true);
        }
      } catch (error) {
        console.error('Error loading cached data:', error);
      } finally {
        setInitialDataLoaded(true);
      }
    };

    loadCachedData();
  }, [JSON.stringify(queryKey)]);

  // Fonction de fetch avec persistance
  const fetchWithPersistence = async (): Promise<TData> => {
    // Si hors ligne, retourner les données du cache
    if (!isOnline) {
      const cached = await offlineStore.getCachedQuery(hashQueryKey(queryKey as unknown[]));
      if (cached !== null) {
        return cached as TData;
      }
      throw new Error('Pas de connexion et aucune donnée en cache');
    }

    // Sinon, faire la requête réseau
    const data = await queryFn();

    // Persister le résultat
    if (shouldPersistQuery(queryKey as unknown[])) {
      await persistQuery(queryKey as unknown[], data);
    }

    setIsFromCache(false);
    return data;
  };

  const query = useQuery<TData, TError>({
    queryKey,
    queryFn: fetchWithPersistence,
    // Utiliser les données du cache comme initialData
    initialData: initialDataLoaded ? initialData : undefined,
    // Toujours considérer les données initiales comme stale pour déclencher un refresh
    initialDataUpdatedAt: initialData ? 0 : undefined,
    // Si hors ligne, ne pas retry
    retry: isOnline ? (queryOptions.retry ?? 1) : false,
    // Désactiver le refetch automatique si hors ligne
    refetchOnMount: isOnline ? (queryOptions.refetchOnMount ?? true) : false,
    refetchOnWindowFocus: isOnline ? (queryOptions.refetchOnWindowFocus ?? false) : false,
    refetchOnReconnect: true,
    // Garder les données plus longtemps en cache
    staleTime: isOnline ? (queryOptions.staleTime ?? 1000 * 60 * 5) : Infinity,
    gcTime: queryOptions.gcTime ?? 1000 * 60 * 60 * 24,
    ...queryOptions,
    enabled: initialDataLoaded && (queryOptions.enabled ?? true),
  });

  return {
    ...query,
    isFromCache: isFromCache && !query.isFetching,
  };
}

/**
 * Hook simplifié pour les requêtes qui doivent toujours être disponibles offline
 */
export function useOfflineData<TData>(
  key: string,
  fetcher: () => Promise<TData>,
  options?: { enabled?: boolean }
) {
  return useOfflineQuery<TData>({
    queryKey: [key],
    queryFn: fetcher,
    enabled: options?.enabled,
  });
}
