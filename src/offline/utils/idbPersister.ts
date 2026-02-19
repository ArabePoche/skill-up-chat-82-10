/**
 * Persister IndexedDB pour @tanstack/react-query-persist-client
 * Sauvegarde et restaure le cache React Query depuis IndexedDB
 * pour une stratégie cache-first avec sync en arrière-plan
 */

import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

const DB_NAME = 'react-query-cache';
const DB_VERSION = 1;
const STORE_NAME = 'query-client';
const CACHE_KEY = 'persistedClient';

/**
 * Ouvre (ou crée) la base IndexedDB dédiée au cache React Query
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Crée un persister IndexedDB compatible avec react-query-persist-client
 * 
 * Stratégie :
 * - Au démarrage, restaure le cache depuis IndexedDB → affichage instantané
 * - En arrière-plan, React Query revalide les données stale via le réseau
 * - Après chaque revalidation, le nouveau cache est sauvegardé dans IndexedDB
 */
export function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(client, CACHE_KEY);
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch (err) {
        console.warn('[IDB Persister] Erreur de sauvegarde (non bloquant):', err);
      }
    },

    restoreClient: async () => {
      try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(CACHE_KEY);
        return new Promise<PersistedClient | undefined>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result as PersistedClient | undefined);
          request.onerror = () => reject(request.error);
        });
      } catch (err) {
        console.warn('[IDB Persister] Erreur de restauration (non bloquant):', err);
        return undefined;
      }
    },

    removeClient: async () => {
      try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(CACHE_KEY);
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch (err) {
        console.warn('[IDB Persister] Erreur de suppression (non bloquant):', err);
      }
    },
  };
}
