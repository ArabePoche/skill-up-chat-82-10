/**
 * Store IndexedDB pour la gestion des fichiers en mode offline-first
 * Supabase = source de téléchargement, Stockage local = source d'affichage
 * 
 * AMÉLIORATION v2:
 * ✅ fileId comme clé stable (indépendant de remoteUrl)
 * ✅ Index fileId pour recherche rapide
 */

import { LocalFileMetadata, FileRegistryEntry, FileStorageStats } from '../types';

const DB_NAME = 'file_storage';
const DB_VERSION = 2; // Incrémenté pour la migration
const FILES_STORE = 'files';
const BLOBS_STORE = 'blobs';

class FileStore {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Génère un fileId stable à partir de l'URL
   */
  generateFileId(remoteUrl: string): string {
    let hash = 0;
    for (let i = 0; i < remoteUrl.length; i++) {
      const char = remoteUrl.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `file_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Initialise la base de données IndexedDB
   */
  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ Failed to open FileStore IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('📁 FileStore IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store pour les métadonnées des fichiers
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          const filesStore = db.createObjectStore(FILES_STORE, { keyPath: 'id' });
          filesStore.createIndex('remoteUrl', 'remoteUrl', { unique: false });
          filesStore.createIndex('fileId', 'fileId', { unique: true });
          filesStore.createIndex('downloadedAt', 'downloadedAt', { unique: false });
          filesStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
        } else {
          // Migration: ajouter l'index fileId si manquant
          const transaction = (event.target as IDBOpenDBRequest).transaction;
          if (transaction) {
            const store = transaction.objectStore(FILES_STORE);
            if (!store.indexNames.contains('fileId')) {
              store.createIndex('fileId', 'fileId', { unique: true });
            }
          }
        }

        // Store séparé pour les blobs (meilleure performance)
        if (!db.objectStoreNames.contains(BLOBS_STORE)) {
          db.createObjectStore(BLOBS_STORE, { keyPath: 'id' });
        }
      };
    });

    return this.initPromise;
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Failed to initialize FileStore database');
    return this.db;
  }

  /**
   * Sauvegarde un fichier dans le stockage local
   * @param fileIdOrUrl - fileId stable ou remoteUrl (pour compatibilité)
   */
  async saveFile(
    fileIdOrUrl: string,
    blob: Blob,
    metadata: Omit<LocalFileMetadata, 'id' | 'fileId' | 'localPath' | 'downloadedAt' | 'lastAccessedAt'>
  ): Promise<LocalFileMetadata> {
    const db = await this.ensureDB();
    
    // Générer un fileId stable
    const fileId = this.generateFileId(metadata.remoteUrl);
    const id = fileId; // Utiliser fileId comme ID principal
    const now = Date.now();

    const fileMetadata: LocalFileMetadata = {
      id,
      fileId,
      localPath: `indexeddb://${id}`,
      downloadedAt: now,
      lastAccessedAt: now,
      ...metadata,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FILES_STORE, BLOBS_STORE], 'readwrite');

      // Sauvegarder les métadonnées
      const filesStore = transaction.objectStore(FILES_STORE);
      filesStore.put(fileMetadata);

      // Sauvegarder le blob
      const blobsStore = transaction.objectStore(BLOBS_STORE);
      blobsStore.put({ id, blob });

      transaction.oncomplete = () => {
        console.log('💾 File saved locally:', metadata.fileName);
        resolve(fileMetadata);
      };

      transaction.onerror = () => {
        console.error('❌ Error saving file:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Récupère un fichier par fileId
   */
  async getFileById(fileId: string): Promise<FileRegistryEntry | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FILES_STORE, BLOBS_STORE], 'readwrite');

      const filesStore = transaction.objectStore(FILES_STORE);
      const blobsStore = transaction.objectStore(BLOBS_STORE);

      const metadataRequest = filesStore.get(fileId);
      const blobRequest = blobsStore.get(fileId);

      let metadata: LocalFileMetadata | null = null;
      let blob: Blob | null = null;

      metadataRequest.onsuccess = () => {
        metadata = metadataRequest.result || null;
        
        // Mettre à jour lastAccessedAt
        if (metadata) {
          metadata.lastAccessedAt = Date.now();
          filesStore.put(metadata);
        }
      };

      blobRequest.onsuccess = () => {
        const result = blobRequest.result;
        blob = result?.blob || null;
      };

      transaction.oncomplete = () => {
        if (metadata && blob) {
          resolve({
            id: metadata.id,
            fileId: metadata.fileId,
            remoteUrl: metadata.remoteUrl,
            metadata,
            blob,
          });
        } else {
          resolve(null);
        }
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Récupère un fichier par URL distante (compatibilité)
   */
  async getFile(remoteUrl: string): Promise<FileRegistryEntry | null> {
    const fileId = this.generateFileId(remoteUrl);
    return this.getFileById(fileId);
  }

  /**
   * Vérifie si un fichier existe localement par fileId
   */
  async hasFileById(fileId: string): Promise<boolean> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FILES_STORE], 'readonly');
      const store = transaction.objectStore(FILES_STORE);
      const request = store.get(fileId);

      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Vérifie si un fichier existe par URL (compatibilité)
   */
  async hasFile(remoteUrl: string): Promise<boolean> {
    const fileId = this.generateFileId(remoteUrl);
    return this.hasFileById(fileId);
  }

  /**
   * Supprime un fichier par fileId
   */
  async deleteFileById(fileId: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FILES_STORE, BLOBS_STORE], 'readwrite');

      transaction.objectStore(FILES_STORE).delete(fileId);
      transaction.objectStore(BLOBS_STORE).delete(fileId);

      transaction.oncomplete = () => {
        console.log('🗑️ File deleted from local storage');
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Supprime un fichier par URL (compatibilité)
   */
  async deleteFile(remoteUrl: string): Promise<void> {
    const fileId = this.generateFileId(remoteUrl);
    return this.deleteFileById(fileId);
  }

  /**
   * Nettoie les fichiers non accédés depuis X jours
   */
  async cleanupOldFiles(daysOld: number = 30): Promise<number> {
    const db = await this.ensureDB();
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FILES_STORE, BLOBS_STORE], 'readwrite');
      const filesStore = transaction.objectStore(FILES_STORE);
      const blobsStore = transaction.objectStore(BLOBS_STORE);
      const index = filesStore.index('lastAccessedAt');

      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const metadata = cursor.value as LocalFileMetadata;
          
          // Ne pas supprimer les fichiers propres à l'utilisateur
          if (!metadata.isOwnFile) {
            filesStore.delete(metadata.id);
            blobsStore.delete(metadata.id);
            deletedCount++;
          }
          
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        console.log(`🧹 Cleaned up ${deletedCount} old files`);
        resolve(deletedCount);
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Récupère les statistiques de stockage
   */
  async getStats(): Promise<FileStorageStats> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FILES_STORE, BLOBS_STORE], 'readonly');
      const filesStore = transaction.objectStore(FILES_STORE);
      const blobsStore = transaction.objectStore(BLOBS_STORE);

      const filesRequest = filesStore.getAll();
      const blobsRequest = blobsStore.getAll();

      let files: LocalFileMetadata[] = [];
      let blobs: { id: string; blob: Blob }[] = [];

      filesRequest.onsuccess = () => {
        files = filesRequest.result || [];
      };

      blobsRequest.onsuccess = () => {
        blobs = blobsRequest.result || [];
      };

      transaction.oncomplete = () => {
        // Calculer la taille totale
        const totalSizeBytes = blobs.reduce((acc, b) => acc + (b.blob?.size || 0), 0);

        // Trouver le plus ancien et le plus récent
        const sorted = [...files].sort((a, b) => a.downloadedAt - b.downloadedAt);

        resolve({
          totalFiles: files.length,
          totalSizeBytes,
          oldestFile: sorted[0] || undefined,
          newestFile: sorted[sorted.length - 1] || undefined,
        });
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Vide tout le stockage local
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FILES_STORE, BLOBS_STORE], 'readwrite');

      transaction.objectStore(FILES_STORE).clear();
      transaction.objectStore(BLOBS_STORE).clear();

      transaction.oncomplete = () => {
        console.log('🗑️ All local files cleared');
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Récupère tous les fichiers stockés localement
   */
  async getAllFiles(): Promise<LocalFileMetadata[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FILES_STORE], 'readonly');
      const store = transaction.objectStore(FILES_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Met à jour l'URL distante d'un fichier (quand elle expire/change)
   */
  async updateRemoteUrl(fileId: string, newRemoteUrl: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FILES_STORE], 'readwrite');
      const store = transaction.objectStore(FILES_STORE);
      const request = store.get(fileId);

      request.onsuccess = () => {
        const metadata = request.result as LocalFileMetadata | undefined;
        if (metadata) {
          metadata.remoteUrl = newRemoteUrl;
          store.put(metadata);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Singleton
export const fileStore = new FileStore();
