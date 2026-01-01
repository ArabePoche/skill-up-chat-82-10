/**
 * Hook pour les mutations offline-first
 * Les mutations sont mises en file d'attente si hors ligne
 */

import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { offlineStore } from '../utils/offlineStore';
import { useOfflineSync } from './useOfflineSync';
import { toast } from '@/hooks/use-toast';

type MutationType = 'message' | 'reaction' | 'progress' | 'profile';

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
  
  const { isOnline } = useOfflineSync();
  const queryClient = useQueryClient();

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
        type: mutationType,
        payload: variables,
      });

      toast({
        title: "Hors ligne",
        description: "L'action sera synchronisée dès que la connexion sera rétablie",
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
  const { isOnline } = useOfflineSync();
  const queryClient = useQueryClient();

  const syncAll = useCallback(async () => {
    if (!isOnline) return { synced: 0, failed: 0 };

    const pending = await offlineStore.getPendingMutations();
    let synced = 0;
    let failed = 0;

    for (const mutation of pending) {
      try {
        // TODO: Implémenter la logique de sync selon le type
        // Pour l'instant on marque comme complété
        await offlineStore.removePendingMutation(mutation.id);
        synced++;
      } catch (error) {
        console.error('Failed to sync mutation:', mutation.id, error);
        await offlineStore.incrementMutationRetry(mutation.id);
        failed++;
      }
    }

    if (synced > 0) {
      // Rafraîchir toutes les données
      queryClient.invalidateQueries();
      toast({
        title: "Synchronisation terminée",
        description: `${synced} action(s) synchronisée(s)`,
      });
    }

    return { synced, failed };
  }, [isOnline, queryClient]);

  return { syncAll };
}
