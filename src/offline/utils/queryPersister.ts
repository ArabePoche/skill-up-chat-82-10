/**
 * Persisteur de cache React Query pour IndexedDB
 * Permet de restaurer le cache au redémarrage de l'app
 */

import { offlineStore } from './offlineStore';

export interface PersistedQuery {
  queryKey: unknown[];
  state: {
    data: unknown;
    dataUpdatedAt: number;
    error: unknown;
    errorUpdatedAt: number;
    status: 'pending' | 'error' | 'success';
  };
}

/**
 * Génère une clé unique pour une queryKey
 */
export const hashQueryKey = (queryKey: unknown[]): string => {
  return JSON.stringify(queryKey);
};

/**
 * Sauvegarde une requête dans le cache persistant
 */
export const persistQuery = async (queryKey: unknown[], data: unknown): Promise<void> => {
  const key = hashQueryKey(queryKey);
  // TTL de 24h par défaut
  await offlineStore.cacheQuery(key, data, 1000 * 60 * 60 * 24);
};

/**
 * Récupère une requête depuis le cache persistant
 */
export const getPersistedQuery = async (queryKey: unknown[]): Promise<unknown | null> => {
  const key = hashQueryKey(queryKey);
  return offlineStore.getCachedQuery(key);
};

/**
 * Vérifie si le cache est encore frais
 */
export const isQueryCacheFresh = async (queryKey: unknown[]): Promise<boolean> => {
  const key = hashQueryKey(queryKey);
  return offlineStore.isQueryFresh(key);
};

/**
 * Configuration pour les requêtes qui doivent être persistées
 * Les clés de requête commençant par ces préfixes seront sauvegardées
 */
export const PERSISTED_QUERY_PREFIXES = [
  'formations',
  'lessons',
  'lesson-messages',
  'user-enrollments',
  'user-profile',
  'profiles',
  'levels',
  'exercises',
] as const;

/**
 * Vérifie si une requête doit être persistée
 */
export const shouldPersistQuery = (queryKey: unknown[]): boolean => {
  if (!queryKey || queryKey.length === 0) return false;
  
  const firstKey = String(queryKey[0]);
  return PERSISTED_QUERY_PREFIXES.some(prefix => firstKey.startsWith(prefix));
};
