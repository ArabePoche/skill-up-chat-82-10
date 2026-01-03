/**
 * Cache mémoire pour le statut des fichiers
 * 
 * PRINCIPE FONDAMENTAL:
 * ✅ Éviter les vérifications répétées d'IndexedDB à chaque render
 * ✅ Stocker le statut et l'URL blob en mémoire
 * ✅ Invalider uniquement lors de téléchargement ou suppression
 * 
 * Ce cache permet d'afficher instantanément les médias sans délai
 * car on ne relit pas IndexedDB à chaque scroll/render.
 */

import { FileDownloadStatus } from '../types';

interface CachedFileStatus {
  /** Statut actuel du fichier */
  status: FileDownloadStatus;
  /** URL blob locale si téléchargé */
  blobUrl: string | null;
  /** Timestamp de la dernière vérification */
  checkedAt: number;
}

class FileStatusCache {
  private cache = new Map<string, CachedFileStatus>();
  
  // Durée de validité du cache (24h) - après on revérifie IndexedDB
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  /**
   * Récupère le statut depuis le cache mémoire
   * Retourne null si pas en cache ou expiré
   */
  get(remoteUrl: string): CachedFileStatus | null {
    const cached = this.cache.get(remoteUrl);
    
    if (!cached) return null;
    
    // Vérifier si le cache est expiré
    if (Date.now() - cached.checkedAt > this.CACHE_TTL_MS) {
      this.cache.delete(remoteUrl);
      return null;
    }
    
    return cached;
  }

  /**
   * Met à jour le cache mémoire
   */
  set(remoteUrl: string, status: CachedFileStatus): void {
    this.cache.set(remoteUrl, status);
  }

  /**
   * Supprime une entrée du cache
   */
  delete(remoteUrl: string): void {
    const cached = this.cache.get(remoteUrl);
    
    // Révoquer l'URL blob si présente
    if (cached?.blobUrl) {
      try {
        URL.revokeObjectURL(cached.blobUrl);
      } catch (e) {
        // Ignorer les erreurs de révocation
      }
    }
    
    this.cache.delete(remoteUrl);
  }

  /**
   * Vérifie si une URL est en cache et téléchargée
   */
  isDownloaded(remoteUrl: string): boolean {
    const cached = this.get(remoteUrl);
    return cached?.status === 'downloaded' && cached?.blobUrl !== null;
  }

  /**
   * Récupère l'URL blob depuis le cache (sans vérification IndexedDB)
   */
  getBlobUrl(remoteUrl: string): string | null {
    return this.get(remoteUrl)?.blobUrl || null;
  }

  /**
   * Vide tout le cache
   */
  clear(): void {
    // Révoquer toutes les URLs blob
    for (const cached of this.cache.values()) {
      if (cached.blobUrl) {
        try {
          URL.revokeObjectURL(cached.blobUrl);
        } catch (e) {}
      }
    }
    
    this.cache.clear();
  }

  /**
   * Retourne le nombre d'entrées en cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Récupère toutes les URLs en cache
   */
  getAllCachedUrls(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Précharge le cache depuis IndexedDB au démarrage
   * À appeler une seule fois au lancement de l'app
   */
  async preloadFromIndexedDB(fileStore: any): Promise<void> {
    try {
      const allFiles = await fileStore.getAllFiles();
      
      for (const file of allFiles) {
        // Charger le blob et créer l'URL
        const entry = await fileStore.getFile(file.remoteUrl);
        
        if (entry?.blob) {
          const blobUrl = URL.createObjectURL(entry.blob);
          
          this.set(file.remoteUrl, {
            status: 'downloaded',
            blobUrl,
            checkedAt: Date.now(),
          });
        }
      }
      
      console.log(`📁 [Cache] Preloaded ${this.size} files from IndexedDB`);
    } catch (error) {
      console.error('❌ Error preloading cache:', error);
    }
  }
}

// Singleton exporté
export const fileStatusCache = new FileStatusCache();
