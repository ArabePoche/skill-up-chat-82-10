/**
 * Hook pour les mutations offline-first
 * Les mutations sont mises en file d'attente si hors ligne
 * et synchronisées automatiquement au retour de la connexion
 */

import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { offlineStore } from '../utils/offlineStore';
import { syncManager } from '../utils/syncManager';
import { toast } from 'sonner';

type MutationType = 'message' | 'reaction' | 'progress' | 'profile' | 'grade' | 'attendance' | 'payment' | 'note' | 'generic';

interface UseOfflineMutationOptions<TData, TVariables, TError = Error> 
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Type de mutation pour la queue offline */
  mutationType: MutationType;
  /** Query keys à invalider après succès */
  invalidateKeys?: unknown[][];
  /** Callback pour créer une version optimiste locale */
  optimisticUpdate?: (variables: TVariables) => TData;
}

export function useOfflineMutation<TData, TVariables, TError = Error>(
  options: UseOfflineMutationOptions<TData, TVariables, TError>
) {
  const { 
    mutationFn, 
    mutationType, 
    invalidateKeys, 
    optimisticUpdate,
    ...mutationOptions 
  } = options;
  
  const [isOnline, setIsOnline] = useState(syncManager.getOnlineStatus());
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = syncManager.onConnectionChange((online) => {
      setIsOnline(online);
    });
    return () => { unsubscribe(); };
  }, []);

  const offlineMutationFn = useCallback(async (variables: TVariables): Promise<TData> => {
    if (isOnline) {
      // En ligne : exécuter directement
      const result = await mutationFn(variables);
      
      // Invalider les queries associées
      if (invalidateKeys) {
        invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
      
      return result;
    } else {
      // Hors ligne : mettre en queue
      await offlineStore.addPendingMutation({
        type: mutationType as 'message' | 'reaction' | 'progress' | 'profile',
        payload: variables,
      });

      toast.info('Modification enregistrée localement', {
        description: 'Elle sera synchronisée dès le retour de la connexion',
      });

      // Retourner une version optimiste si disponible
      if (optimisticUpdate) {
        return optimisticUpdate(variables);
      }

      // Sinon retourner un objet vide typé
      return {} as TData;
    }
  }, [isOnline, mutationFn, mutationType, invalidateKeys, optimisticUpdate, queryClient]);

  return useMutation<TData, TError, TVariables>({
    mutationFn: offlineMutationFn,
    ...mutationOptions,
  });
}

/**
 * Hook pour synchroniser les mutations en attente
 */
export function useSyncPendingMutations() {
  const [isOnline, setIsOnline] = useState(syncManager.getOnlineStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const queryClient = useQueryClient();

  // Charger le compteur au démarrage
  useEffect(() => {
    const loadCount = async () => {
      const pending = await offlineStore.getPendingMutations();
      setPendingCount(pending.length);
    };
    loadCount();

    // S'abonner aux changements de connexion
    const unsubscribe = syncManager.onConnectionChange(async (online) => {
      setIsOnline(online);
      if (online) {
        // Recharger le compteur car syncManager va synchroniser
        const pending = await offlineStore.getPendingMutations();
        setPendingCount(pending.length);
      }
    });

    // S'abonner aux événements de sync
    const unsubscribeSync = syncManager.onSyncEvent((event) => {
      switch (event.type) {
        case 'start':
          setIsSyncing(true);
          break;
        case 'progress':
          setSyncProgress({ current: event.current || 0, total: event.total || 0 });
          break;
        case 'complete':
        case 'error':
          setIsSyncing(false);
          setSyncProgress({ current: 0, total: 0 });
          // Recharger le compteur
          offlineStore.getPendingMutations().then(pending => setPendingCount(pending.length));
          break;
      }
    });

    return () => {
      unsubscribe();
      unsubscribeSync();
    };
  }, []);

  const syncAllPending = useCallback(async () => {
    if (!isOnline || isSyncing) return { synced: 0, failed: 0 };

    // Forcer une synchronisation
    await syncManager.forceSync();

    // Rafraîchir toutes les données
    queryClient.invalidateQueries();

    const pending = await offlineStore.getPendingMutations();
    setPendingCount(pending.length);

    return { synced: 0, failed: pending.length };
  }, [isOnline, isSyncing, queryClient]);

  return { 
    isSyncing, 
    pendingCount, 
    syncProgress, 
    syncAllPending,
    isOnline,
  };
}
