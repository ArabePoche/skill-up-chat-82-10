/**
 * Cache mémoire pour le statut des fichiers
 * 
 * PRINCIPE FONDAMENTAL:
 * ✅ Éviter les vérifications répétées d'IndexedDB à chaque render
 * ✅ Stocker le statut et l'URL blob en mémoire
 * ✅ Invalider uniquement lors de téléchargement ou suppression
 * ✅ Utiliser fileId comme clé stable (pas remoteUrl)
 * ✅ Persistance optionnelle en sessionStorage
 * 
 * Ce cache permet d'afficher instantanément les médias sans délai
 * car on ne relit pas IndexedDB à chaque scroll/render.
 */

import { FileDownloadStatus, PreloadStrategy } from '../types';

interface CachedFileStatus {
  /** ID stable du fichier */
  fileId: string;
  /** Statut actuel du fichier */
  status: FileDownloadStatus;
  /** URL blob locale si téléchargé */
  blobUrl: string | null;
  /** Timestamp de la dernière vérification */
  checkedAt: number;
  /** URL distante (métadonnée) */
  remoteUrl?: string;
}

// Clé pour la persistance sessionStorage
const SESSION_STORAGE_KEY = 'file_status_cache_index';

class FileStatusCache {
  private cache = new Map<string, CachedFileStatus>();
  
  // Durée de validité du cache (24h) - après on revérifie IndexedDB
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  
  // Index remoteUrl -> fileId pour la compatibilité
  private urlToFileIdIndex = new Map<string, string>();

  /**
   * Génère un fileId stable à partir de l'URL
   * Utilisé comme fallback si aucun fileId n'est fourni
   */
  generateFileId(remoteUrl: string): string {
    // Hash simple mais stable de l'URL
    let hash = 0;
    for (let i = 0; i < remoteUrl.length; i++) {
      const char = remoteUrl.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `file_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Récupère le statut depuis le cache mémoire par fileId
   * Retourne null si pas en cache ou expiré
   */
  get(fileId: string): CachedFileStatus | null {
    const cached = this.cache.get(fileId);
    
    if (!cached) return null;
    
    // Vérifier si le cache est expiré
    if (Date.now() - cached.checkedAt > this.CACHE_TTL_MS) {
      this.cache.delete(fileId);
      return null;
    }
    
    return cached;
  }

  /**
   * Récupère le statut par URL distante (compatibilité)
   */
  getByUrl(remoteUrl: string): CachedFileStatus | null {
    const fileId = this.urlToFileIdIndex.get(remoteUrl) || this.generateFileId(remoteUrl);
    return this.get(fileId);
  }

  /**
   * Met à jour le cache mémoire
   */
  set(fileId: string, status: CachedFileStatus): void {
    this.cache.set(fileId, status);
    
    // Maintenir l'index URL -> fileId
    if (status.remoteUrl) {
      this.urlToFileIdIndex.set(status.remoteUrl, fileId);
    }
  }

  /**
   * Met à jour par URL distante (compatibilité)
   */
  setByUrl(remoteUrl: string, statusData: Omit<CachedFileStatus, 'fileId'>): void {
    const fileId = this.generateFileId(remoteUrl);
    this.set(fileId, { ...statusData, fileId, remoteUrl });
  }

  /**
   * Supprime une entrée du cache par fileId
   */
  delete(fileId: string): void {
    const cached = this.cache.get(fileId);
    
    // Révoquer l'URL blob si présente
    if (cached?.blobUrl) {
      try {
        URL.revokeObjectURL(cached.blobUrl);
      } catch (e) {
        // Ignorer les erreurs de révocation
      }
    }
    
    // Supprimer de l'index URL
    if (cached?.remoteUrl) {
      this.urlToFileIdIndex.delete(cached.remoteUrl);
    }
    
    this.cache.delete(fileId);
  }

  /**
   * Supprime par URL distante (compatibilité)
   */
  deleteByUrl(remoteUrl: string): void {
    const fileId = this.urlToFileIdIndex.get(remoteUrl) || this.generateFileId(remoteUrl);
    this.delete(fileId);
  }

  /**
   * Vérifie si un fichier est téléchargé (par fileId)
   */
  isDownloaded(fileId: string): boolean {
    const cached = this.get(fileId);
    return cached?.status === 'downloaded' && cached?.blobUrl !== null;
  }

  /**
   * Vérifie par URL (compatibilité)
   */
  isDownloadedByUrl(remoteUrl: string): boolean {
    const fileId = this.urlToFileIdIndex.get(remoteUrl) || this.generateFileId(remoteUrl);
    return this.isDownloaded(fileId);
  }

  /**
   * Récupère l'URL blob depuis le cache
   */
  getBlobUrl(fileId: string): string | null {
    return this.get(fileId)?.blobUrl || null;
  }

  /**
   * Récupère l'URL blob par URL distante
   */
  getBlobUrlByRemoteUrl(remoteUrl: string): string | null {
    return this.getByUrl(remoteUrl)?.blobUrl || null;
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
    this.urlToFileIdIndex.clear();
    
    // Supprimer aussi de sessionStorage
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {}
  }

  /**
   * Retourne le nombre d'entrées en cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Récupère tous les fileIds en cache
   */
  getAllCachedFileIds(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Récupère toutes les URLs en cache (compatibilité)
   */
  getAllCachedUrls(): string[] {
    return Array.from(this.urlToFileIdIndex.keys());
  }

  /**
   * Précharge le cache depuis IndexedDB au démarrage
   * STRATÉGIE DE PRÉCHARGEMENT PARTIEL pour la scalabilité
   * 
   * @param fileStore - Le store IndexedDB
   * @param strategy - Stratégie de préchargement (par défaut: les plus récents)
   */
  async preloadFromIndexedDB(
    fileStore: any, 
    strategy?: PreloadStrategy
  ): Promise<void> {
    try {
      const allFiles = await fileStore.getAllFiles();
      
      // Trier par date d'accès (les plus récents d'abord)
      const sortedFiles = [...allFiles].sort(
        (a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0)
      );
      
      // Appliquer la stratégie de préchargement
      let filesToPreload = sortedFiles;
      
      if (strategy?.recentlyUsed) {
        filesToPreload = filesToPreload.slice(0, strategy.recentlyUsed);
      }
      
      if (strategy?.ownFilesOnly) {
        filesToPreload = filesToPreload.filter(f => f.isOwnFile);
      }
      
      if (strategy?.lessonId) {
        // Si on a un lessonId, prioriser ces fichiers
        // (à implémenter selon la structure de données)
      }
      
      // Par défaut, limiter à 100 fichiers pour éviter la surcharge mémoire
      const maxPreload = strategy?.recentlyUsed || 100;
      filesToPreload = filesToPreload.slice(0, maxPreload);
      
      for (const file of filesToPreload) {
        // Charger le blob et créer l'URL
        const entry = await fileStore.getFile(file.remoteUrl);
        
        if (entry?.blob) {
          const blobUrl = URL.createObjectURL(entry.blob);
          const fileId = file.fileId || this.generateFileId(file.remoteUrl);
          
          this.set(fileId, {
            fileId,
            status: 'downloaded',
            blobUrl,
            checkedAt: Date.now(),
            remoteUrl: file.remoteUrl,
          });
        }
      }
      
      console.log(`📁 [Cache] Preloaded ${this.size}/${allFiles.length} files from IndexedDB`);
    } catch (error) {
      console.error('❌ Error preloading cache:', error);
    }
  }

  /**
   * Sauvegarde l'index du cache en sessionStorage
   * (Uniquement les fileIds, pas les blobs)
   */
  persistToSession(): void {
    try {
      const index: Record<string, { status: FileDownloadStatus; remoteUrl?: string }> = {};
      
      for (const [fileId, cached] of this.cache.entries()) {
        if (cached.status === 'downloaded') {
          index[fileId] = {
            status: cached.status,
            remoteUrl: cached.remoteUrl,
          };
        }
      }
      
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(index));
    } catch (e) {
      // sessionStorage peut être plein ou désactivé
    }
  }

  /**
   * Restaure l'index depuis sessionStorage
   * Les blobs devront être rechargés depuis IndexedDB
   */
  restoreFromSession(): string[] {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) return [];
      
      const index = JSON.parse(stored) as Record<string, { status: FileDownloadStatus; remoteUrl?: string }>;
      const fileIdsToReload: string[] = [];
      
      for (const [fileId, data] of Object.entries(index)) {
        if (data.status === 'downloaded') {
          fileIdsToReload.push(fileId);
          
          // Marquer comme "à recharger" (pas de blobUrl encore)
          this.set(fileId, {
            fileId,
            status: 'downloaded',
            blobUrl: null, // Sera rechargé
            checkedAt: Date.now(),
            remoteUrl: data.remoteUrl,
          });
        }
      }
      
      return fileIdsToReload;
    } catch (e) {
      return [];
    }
  }
}

// Singleton exporté
export const fileStatusCache = new FileStatusCache();
