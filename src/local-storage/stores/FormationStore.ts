/**
 * Store IndexedDB pour les formations
 * Téléchargement et accès offline des formations et leçons
 */

import { StoredFormation, FormationData, StoredLesson, SyncMetadata } from '../types';

const DB_NAME = 'whatsapp_formations';
const DB_VERSION = 1;
const FORMATIONS_STORE = 'formations';
const LESSONS_STORE = 'lessons';
const MEDIA_STORE = 'media_files';
const SYNC_STORE = 'sync_metadata';

interface StoredMedia {
  url: string;
  blob: Blob;
  type: 'audio' | 'video' | 'image';
  size: number;
  downloadedAt: number;
}

class FormationStore {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        console.log('📚 FormationStore initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Formations store
        if (!db.objectStoreNames.contains(FORMATIONS_STORE)) {
          const store = db.createObjectStore(FORMATIONS_STORE, { keyPath: 'id' });
          store.createIndex('downloadedAt', 'downloadedAt', { unique: false });
          store.createIndex('lastSyncAt', 'lastSyncAt', { unique: false });
          store.createIndex('isFullyDownloaded', 'isFullyDownloaded', { unique: false });
        }

        // Lessons store
        if (!db.objectStoreNames.contains(LESSONS_STORE)) {
          const store = db.createObjectStore(LESSONS_STORE, { keyPath: 'id' });
          store.createIndex('formationId', 'formationId', { unique: false });
          store.createIndex('levelId', 'levelId', { unique: false });
        }

        // Media files store
        if (!db.objectStoreNames.contains(MEDIA_STORE)) {
          const store = db.createObjectStore(MEDIA_STORE, { keyPath: 'url' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('downloadedAt', 'downloadedAt', { unique: false });
        }

        // Sync metadata store
        if (!db.objectStoreNames.contains(SYNC_STORE)) {
          db.createObjectStore(SYNC_STORE, { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('FormationStore not initialized');
    return this.db;
  }

  // ==================== FORMATIONS ====================

  /**
   * Sauvegarde une formation complète
   */
  async saveFormation(formation: FormationData, isFullyDownloaded: boolean = false): Promise<void> {
    const db = await this.ensureDB();
    
    const stored: StoredFormation = {
      id: formation.id,
      data: formation,
      downloadedAt: Date.now(),
      lastSyncAt: Date.now(),
      syncVersion: 1,
      isFullyDownloaded,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FORMATIONS_STORE], 'readwrite');
      const store = transaction.objectStore(FORMATIONS_STORE);
      store.put(stored);

      transaction.oncomplete = () => {
        console.log('💾 Formation saved:', formation.title);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Récupère une formation
   */
  async getFormation(formationId: string): Promise<FormationData | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FORMATIONS_STORE], 'readonly');
      const store = transaction.objectStore(FORMATIONS_STORE);
      const request = store.get(formationId);

      request.onsuccess = () => {
        const result = request.result as StoredFormation | undefined;
        resolve(result?.data || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère toutes les formations téléchargées
   */
  async getAllFormations(): Promise<FormationData[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FORMATIONS_STORE], 'readonly');
      const store = transaction.objectStore(FORMATIONS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as StoredFormation[];
        resolve(results.map(r => r.data));
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Vérifie si une formation est téléchargée
   */
  async isFormationDownloaded(formationId: string): Promise<boolean> {
    const formation = await this.getFormation(formationId);
    return formation !== null;
  }

  /**
   * Met à jour le timestamp de sync
   */
  async updateSyncTime(formationId: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FORMATIONS_STORE], 'readwrite');
      const store = transaction.objectStore(FORMATIONS_STORE);
      const getRequest = store.get(formationId);

      getRequest.onsuccess = () => {
        const formation = getRequest.result as StoredFormation;
        if (formation) {
          formation.lastSyncAt = Date.now();
          formation.syncVersion++;
          store.put(formation);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ==================== LESSONS ====================

  /**
   * Sauvegarde une leçon
   */
  async saveLesson(lesson: any, formationId: string, levelId: string): Promise<void> {
    const db = await this.ensureDB();

    const storedLesson = {
      id: lesson.id,
      formationId,
      levelId,
      data: lesson,
      downloadedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([LESSONS_STORE], 'readwrite');
      const store = transaction.objectStore(LESSONS_STORE);
      store.put(storedLesson);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Récupère une leçon
   */
  async getLesson(lessonId: string): Promise<any | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([LESSONS_STORE], 'readonly');
      const store = transaction.objectStore(LESSONS_STORE);
      const request = store.get(lessonId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.data || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère les leçons d'une formation
   */
  async getLessonsByFormation(formationId: string): Promise<any[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([LESSONS_STORE], 'readonly');
      const store = transaction.objectStore(LESSONS_STORE);
      const index = store.index('formationId');
      const request = index.getAll(formationId);

      request.onsuccess = () => {
        const results = request.result || [];
        resolve(results.map(r => r.data));
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== MEDIA ====================

  /**
   * Télécharge et sauvegarde un fichier media
   */
  async downloadMedia(url: string, type: 'audio' | 'video' | 'image'): Promise<string | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const db = await this.ensureDB();

      const stored: StoredMedia = {
        url,
        blob,
        type,
        size: blob.size,
        downloadedAt: Date.now(),
      };

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([MEDIA_STORE], 'readwrite');
        const store = transaction.objectStore(MEDIA_STORE);
        store.put(stored);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });

      console.log(`📥 Media downloaded: ${type} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error downloading media:', error);
      return null;
    }
  }

  /**
   * Récupère un fichier media local
   */
  async getMedia(url: string): Promise<string | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MEDIA_STORE], 'readonly');
      const store = transaction.objectStore(MEDIA_STORE);
      const request = store.get(url);

      request.onsuccess = () => {
        const result = request.result as StoredMedia | undefined;
        if (result?.blob) {
          resolve(URL.createObjectURL(result.blob));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Vérifie si un media est téléchargé
   */
  async isMediaDownloaded(url: string): Promise<boolean> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MEDIA_STORE], 'readonly');
      const store = transaction.objectStore(MEDIA_STORE);
      const request = store.get(url);

      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== SYNC ====================

  /**
   * Sauvegarde les métadonnées de sync
   */
  async saveSyncMetadata(metadata: SyncMetadata): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SYNC_STORE], 'readwrite');
      const store = transaction.objectStore(SYNC_STORE);
      store.put(metadata);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Récupère les métadonnées de sync
   */
  async getSyncMetadata(key: string): Promise<SyncMetadata | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SYNC_STORE], 'readonly');
      const store = transaction.objectStore(SYNC_STORE);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== NETTOYAGE ====================

  /**
   * Supprime une formation et ses données
   */
  async deleteFormation(formationId: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FORMATIONS_STORE, LESSONS_STORE], 'readwrite');

      // Supprimer la formation
      transaction.objectStore(FORMATIONS_STORE).delete(formationId);

      // Supprimer les leçons
      const lessonStore = transaction.objectStore(LESSONS_STORE);
      const index = lessonStore.index('formationId');
      const request = index.openCursor(formationId);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        console.log('🗑️ Formation deleted:', formationId);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Calcule la taille totale du stockage
   */
  async getStorageSize(): Promise<{ total: number; media: number; formations: number }> {
    if (!navigator.storage?.estimate) {
      return { total: 0, media: 0, formations: 0 };
    }

    const estimate = await navigator.storage.estimate();
    return {
      total: estimate.usage || 0,
      media: 0, // Estimation basée sur les media téléchargés
      formations: 0,
    };
  }

  /**
   * Nettoie les vieux médias
   */
  async cleanOldMedia(maxAgeDays: number = 30): Promise<number> {
    const db = await this.ensureDB();
    const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MEDIA_STORE], 'readwrite');
      const store = transaction.objectStore(MEDIA_STORE);
      const index = store.index('downloadedAt');
      const range = IDBKeyRange.upperBound(cutoff);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        console.log(`🧹 Cleaned ${deletedCount} old media files`);
        resolve(deletedCount);
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Vide tout le stockage
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [FORMATIONS_STORE, LESSONS_STORE, MEDIA_STORE, SYNC_STORE],
        'readwrite'
      );

      transaction.objectStore(FORMATIONS_STORE).clear();
      transaction.objectStore(LESSONS_STORE).clear();
      transaction.objectStore(MEDIA_STORE).clear();
      transaction.objectStore(SYNC_STORE).clear();

      transaction.oncomplete = () => {
        console.log('🧹 All formations cleared');
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Singleton
export const formationStore = new FormationStore();
formationStore.init().catch(console.error);
