/**
 * Hook pour précharger le cache mémoire depuis IndexedDB au démarrage
 * 
 * ⚡ OPTIMISATION CRITIQUE:
 * - Charge les URLs blob en mémoire dès le montage du composant parent
 * - Permet un affichage instantané des médias déjà téléchargés
 * - Évite le délai de vérification IndexedDB pour chaque média
 */

import { useEffect, useRef, useState } from 'react';
import { fileStore } from '../stores/FileStore';
import { fileStatusCache } from '../stores/FileStatusCache';

interface UseCachePreloaderOptions {
  /** Liste des URLs à précharger (optionnel - si vide, précharge tout) */
  urls?: string[];
  /** Nombre max de fichiers à précharger */
  maxFiles?: number;
  /** Activer le préchargement */
  enabled?: boolean;
}

interface UseCachePreloaderReturn {
  /** Le préchargement est terminé */
  isReady: boolean;
  /** Nombre de fichiers préchargés */
  preloadedCount: number;
  /** Préchargement en cours */
  isLoading: boolean;
}

export const useCachePreloader = ({
  urls,
  maxFiles = 100,
  enabled = true,
}: UseCachePreloaderOptions = {}): UseCachePreloaderReturn => {
  const [isReady, setIsReady] = useState(false);
  const [preloadedCount, setPreloadedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const hasPreloadedRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasPreloadedRef.current) return;
    hasPreloadedRef.current = true;

    const preload = async () => {
      setIsLoading(true);
      
      try {
        // Initialiser le fileStore
        await fileStore.init();
        
        if (urls && urls.length > 0) {
          // Précharger uniquement les URLs spécifiées
          let loaded = 0;
          for (const url of urls.slice(0, maxFiles)) {
            if (!url) continue;
            
            // Vérifier si déjà en cache mémoire
            const cached = fileStatusCache.getByUrl(url);
            if (cached?.blobUrl) {
              loaded++;
              continue;
            }
            
            // Charger depuis IndexedDB
            const entry = await fileStore.getFile(url);
            if (entry?.blob) {
              const blobUrl = URL.createObjectURL(entry.blob);
              fileStatusCache.setByUrl(url, {
                status: 'downloaded',
                blobUrl,
                checkedAt: Date.now(),
              });
              loaded++;
            }
          }
          setPreloadedCount(loaded);
        } else {
          // Précharger les fichiers les plus récents
          const allFiles = await fileStore.getAllFiles();
          
          // Trier par date d'accès (les plus récents d'abord)
          const sortedFiles = [...allFiles]
            .sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0))
            .slice(0, maxFiles);
          
          let loaded = 0;
          for (const file of sortedFiles) {
            if (!file.remoteUrl) continue;
            
            // Vérifier si déjà en cache
            const cached = fileStatusCache.getByUrl(file.remoteUrl);
            if (cached?.blobUrl) {
              loaded++;
              continue;
            }
            
            // Charger le blob
            const entry = await fileStore.getFile(file.remoteUrl);
            if (entry?.blob) {
              const blobUrl = URL.createObjectURL(entry.blob);
              fileStatusCache.setByUrl(file.remoteUrl, {
                status: 'downloaded',
                blobUrl,
                checkedAt: Date.now(),
              });
              loaded++;
            }
          }
          setPreloadedCount(loaded);
        }
        
        console.log(`⚡ [Preloader] Cache prêt: ${preloadedCount} fichiers en mémoire`);
      } catch (error) {
        console.error('❌ [Preloader] Erreur:', error);
      } finally {
        setIsLoading(false);
        setIsReady(true);
      }
    };

    // Lancer le préchargement immédiatement
    preload();
  }, [enabled, urls, maxFiles]);

  return {
    isReady,
    preloadedCount,
    isLoading,
  };
};

/**
 * Précharge le cache pour une liste d'URLs de manière synchrone si possible
 * À appeler avant le rendu des messages
 */
export const preloadCacheForUrls = async (urls: string[]): Promise<number> => {
  if (!urls.length) return 0;
  
  await fileStore.init();
  let loaded = 0;
  
  for (const url of urls) {
    if (!url) continue;
    
    // Déjà en cache?
    const cached = fileStatusCache.getByUrl(url);
    if (cached?.blobUrl) {
      loaded++;
      continue;
    }
    
    // Charger depuis IndexedDB
    const entry = await fileStore.getFile(url);
    if (entry?.blob) {
      const blobUrl = URL.createObjectURL(entry.blob);
      fileStatusCache.setByUrl(url, {
        status: 'downloaded',
        blobUrl,
        checkedAt: Date.now(),
      });
      loaded++;
    }
  }
  
  return loaded;
};
