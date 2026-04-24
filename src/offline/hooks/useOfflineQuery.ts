/**
 * Hook générique pour les requêtes offline-first.
 *
 * Lit d'abord le cache local **de manière synchrone** (miroir mémoire),
 * pré-injecte les données dans React Query au premier rendu pour qu'aucun
 * spinner ne s'affiche si une donnée est déjà connue, puis synchronise
 * en arrière-plan.
 */

import {
  useQuery,
  UseQueryOptions,
  UseQueryResult,
  QueryKey,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { offlineStore } from '../utils/offlineStore';
import {
  hashQueryKey,
  shouldPersistQuery,
  persistQuery,
} from '../utils/queryPersister';
import { useOfflineSync } from './useOfflineSync';

interface UseOfflineQueryOptions<TData, TError>
  extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  /** TTL du cache en millisecondes (défaut: 24h) */
  cacheTTL?: number;
  /** Forcer le refresh même si le cache est frais */
  forceRefresh?: boolean;
}

export function useOfflineQuery<TData, TError = Error>(
  options: UseOfflineQueryOptions<TData, TError>,
): UseQueryResult<TData, TError> & { isFromCache: boolean } {
  const {
    queryKey,
    queryFn,
    cacheTTL = 1000 * 60 * 60 * 24,
    forceRefresh: _forceRefresh = false,
    ...queryOptions
  } = options;
  const { isOnline } = useOfflineSync();
  const queryClient = useQueryClient();

  const stableKey = useMemo(() => hashQueryKey(queryKey as unknown[]), [JSON.stringify(queryKey)]);

  // Lecture *synchrone* du miroir mémoire au moment du premier rendu :
  // si une donnée est connue, elle est injectée dans React Query immédiatement.
  const syncCached = useMemo<TData | undefined>(() => {
    if (!shouldPersistQuery(queryKey as unknown[])) return undefined;
    const cached = offlineStore.getCachedQuerySync(stableKey);
    return cached === null ? undefined : (cached as TData);
  }, [stableKey]);

  const [isFromCache, setIsFromCache] = useState(syncCached !== undefined);

  // Seed React Query avec la donnée synchrone (avant toute requête réseau).
  useEffect(() => {
    if (syncCached !== undefined) {
      const existing = queryClient.getQueryData(queryKey);
      if (existing === undefined) {
        queryClient.setQueryData(queryKey, syncCached);
      }
    }
  }, [stableKey, syncCached, queryClient, queryKey]);

  // En complément, on tente une lecture IndexedDB asynchrone au cas où le
  // warmup mémoire n'aurait pas encore terminé son travail au tout premier rendu.
  useEffect(() => {
    if (syncCached !== undefined) return;
    if (!shouldPersistQuery(queryKey as unknown[])) return;
    let cancelled = false;
    offlineStore
      .getCachedQuery(stableKey)
      .then((cached) => {
        if (cancelled || cached === null || cached === undefined) return;
        const existing = queryClient.getQueryData(queryKey);
        if (existing === undefined) {
          queryClient.setQueryData(queryKey, cached);
          setIsFromCache(true);
        }
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [stableKey, syncCached, queryClient, queryKey]);

  // Fonction de fetch avec persistance
  const fetchWithPersistence = async (): Promise<TData> => {
    if (!isOnline) {
      const cached = await offlineStore.getCachedQuery(stableKey);
      if (cached !== null) {
        return cached as TData;
      }
      throw new Error('Pas de connexion et aucune donnée en cache');
    }

    const data = await queryFn();

    if (shouldPersistQuery(queryKey as unknown[])) {
      try {
        await persistQuery(queryKey as unknown[], data);
      } catch (err) {
        console.error('Error persisting query', queryKey, err);
      }
    }

    setIsFromCache(false);
    return data;
  };

  const query = useQuery<TData, TError>({
    queryKey,
    queryFn: fetchWithPersistence,
    // Pré-injection des données synchrones du miroir mémoire — pas de spinner.
    initialData: syncCached as any,
    // Considérées comme stale pour qu'un refresh réseau démarre immédiatement.
    initialDataUpdatedAt: syncCached !== undefined ? 0 : undefined,
    retry: isOnline ? (queryOptions.retry ?? 1) : false,
    refetchOnMount: isOnline ? (queryOptions.refetchOnMount ?? true) : false,
    refetchOnWindowFocus: isOnline ? (queryOptions.refetchOnWindowFocus ?? false) : false,
    refetchOnReconnect: true,
    staleTime: isOnline ? (queryOptions.staleTime ?? 1000 * 60 * 5) : Infinity,
    gcTime: queryOptions.gcTime ?? 1000 * 60 * 60 * 24,
    ...queryOptions,
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
  options?: { enabled?: boolean },
) {
  return useOfflineQuery<TData>({
    queryKey: [key],
    queryFn: fetcher,
    enabled: options?.enabled,
  });
}
