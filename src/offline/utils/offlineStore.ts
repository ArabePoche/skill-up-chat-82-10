/**
 * Stockage IndexedDB pour les formations et leçons offline
 * Gère le téléchargement et la mise en cache des contenus
 */

const DB_NAME = 'offline_content';
const DB_VERSION = 1;
const FORMATIONS_STORE = 'formations';
const LESSONS_STORE = 'lessons';
const AUDIO_FILES_STORE = 'audio_files';

interface OfflineFormation {
  id: string;
  data: any;
  downloadedAt: number;
  lastSyncAt: number;
}

interface OfflineLesson {
  id: string;
  formationId: string;
  data: any;
  audioBlob?: Blob;
  audioUrl?: string;
  downloadedAt: number;
}

interface OfflineAudioFile {
  url: string;
  blob: Blob;
  downloadedAt: number;
}

class OfflineStore {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store pour les formations
        if (!db.objectStoreNames.contains(FORMATIONS_STORE)) {
          const formationStore = db.createObjectStore(FORMATIONS_STORE, { keyPath: 'id' });
          formationStore.createIndex('downloadedAt', 'downloadedAt', { unique: false });
        }

        // Store pour les leçons
        if (!db.objectStoreNames.contains(LESSONS_STORE)) {
          const lessonStore = db.createObjectStore(LESSONS_STORE, { keyPath: 'id' });
          lessonStore.createIndex('formationId', 'formationId', { unique: false });
        }

        // Store pour les fichiers audio
        if (!db.objectStoreNames.contains(AUDIO_FILES_STORE)) {
          const audioStore = db.createObjectStore(AUDIO_FILES_STORE, { keyPath: 'url' });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Failed to initialize database');
    return this.db;
  }

  /**
   * Sauvegarde une formation pour l'accès offline
   */
  async saveFormation(formation: any): Promise<void> {
    const db = await this.ensureDB();
    const offlineFormation: OfflineFormation = {
      id: formation.id,
      data: formation,
      downloadedAt: Date.now(),
      lastSyncAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FORMATIONS_STORE], 'readwrite');
      const store = transaction.objectStore(FORMATIONS_STORE);
      const request = store.put(offlineFormation);

      request.onsuccess = () => {
        console.log('📦 Formation saved offline:', formation.id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère une formation depuis le cache offline
   */
  async getFormation(formationId: string): Promise<any | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FORMATIONS_STORE], 'readonly');
      const store = transaction.objectStore(FORMATIONS_STORE);
      const request = store.get(formationId);

      request.onsuccess = () => {
        const result = request.result as OfflineFormation | undefined;
        resolve(result?.data || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère toutes les formations offline
   */
  async getAllFormations(): Promise<any[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FORMATIONS_STORE], 'readonly');
      const store = transaction.objectStore(FORMATIONS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as OfflineFormation[];
        resolve(results.map(r => r.data));
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Sauvegarde une leçon avec son audio
   */
  async saveLesson(lesson: any, audioBlob?: Blob): Promise<void> {
    const db = await this.ensureDB();
    const offlineLesson: OfflineLesson = {
      id: lesson.id,
      formationId: lesson.formation_id,
      data: lesson,
      audioBlob,
      audioUrl: lesson.audio_url,
      downloadedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([LESSONS_STORE], 'readwrite');
      const store = transaction.objectStore(LESSONS_STORE);
      const request = store.put(offlineLesson);

      request.onsuccess = () => {
        console.log('📦 Lesson saved offline:', lesson.id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère une leçon depuis le cache offline
   */
  async getLesson(lessonId: string): Promise<any | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([LESSONS_STORE], 'readonly');
      const store = transaction.objectStore(LESSONS_STORE);
      const request = store.get(lessonId);

      request.onsuccess = () => {
        const result = request.result as OfflineLesson | undefined;
        if (result && result.audioBlob) {
          // Créer une URL blob pour l'audio
          result.data.offlineAudioUrl = URL.createObjectURL(result.audioBlob);
        }
        resolve(result?.data || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère toutes les leçons d'une formation
   */
  async getLessonsByFormation(formationId: string): Promise<any[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([LESSONS_STORE], 'readonly');
      const store = transaction.objectStore(LESSONS_STORE);
      const index = store.index('formationId');
      const request = index.getAll(formationId);

      request.onsuccess = () => {
        const results = request.result as OfflineLesson[];
        const lessons = results.map(r => {
          if (r.audioBlob) {
            r.data.offlineAudioUrl = URL.createObjectURL(r.audioBlob);
          }
          return r.data;
        });
        resolve(lessons);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Télécharge et sauvegarde un fichier audio
   */
  async downloadAudio(url: string): Promise<Blob | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to download audio');
      
      const blob = await response.blob();
      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([AUDIO_FILES_STORE], 'readwrite');
        const store = transaction.objectStore(AUDIO_FILES_STORE);
        const request = store.put({
          url,
          blob,
          downloadedAt: Date.now(),
        });

        request.onsuccess = () => {
          console.log('🎵 Audio downloaded:', url);
          resolve(blob);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error downloading audio:', error);
      return null;
    }
  }

  /**
   * Supprime une formation et ses leçons du cache
   */
  async deleteFormation(formationId: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise(async (resolve, reject) => {
      try {
        // Supprimer toutes les leçons de la formation
        const lessons = await this.getLessonsByFormation(formationId);
        const transaction = db.transaction([FORMATIONS_STORE, LESSONS_STORE], 'readwrite');
        
        const formationStore = transaction.objectStore(FORMATIONS_STORE);
        formationStore.delete(formationId);

        const lessonStore = transaction.objectStore(LESSONS_STORE);
        lessons.forEach(lesson => lessonStore.delete(lesson.id));

        transaction.oncomplete = () => {
          console.log('🗑️ Formation deleted from offline:', formationId);
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Vérifie si une formation est disponible offline
   */
  async isFormationOffline(formationId: string): Promise<boolean> {
    const formation = await this.getFormation(formationId);
    return formation !== null;
  }

  /**
   * Récupère la taille totale du cache
   */
  async getCacheSize(): Promise<number> {
    if (!navigator.storage || !navigator.storage.estimate) return 0;
    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }
}

export const offlineStore = new OfflineStore();
offlineStore.init().catch(console.error);
