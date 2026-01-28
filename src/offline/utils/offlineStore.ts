/**
 * Stockage IndexedDB étendu pour l'architecture offline-first
 * Gère le cache de toutes les données de l'application
 */

const DB_NAME = 'offline_content';
const DB_VERSION = 2; // Incrémenté pour supporter les nouveaux stores
const FORMATIONS_STORE = 'formations';
const LESSONS_STORE = 'lessons';
const AUDIO_FILES_STORE = 'audio_files';
const MESSAGES_STORE = 'messages';
const PROFILES_STORE = 'profiles';
const QUERY_CACHE_STORE = 'query_cache';
const PENDING_MUTATIONS_STORE = 'pending_mutations';

// Interfaces
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

interface OfflineMessage {
  id: string;
  lessonId: string;
  formationId: string;
  data: any;
  isPending: boolean;
  createdAt: number;
}

interface OfflineProfile {
  id: string;
  data: any;
  updatedAt: number;
}

interface CachedQuery {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
}

interface PendingMutation {
  id: string;
  type: 'message' | 'reaction' | 'progress' | 'profile' | 'grade' | 'attendance' | 'payment' | 'note' | 'generic';
  payload: any;
  createdAt: number;
  retryCount: number;
}

class OfflineStore {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('📦 IndexedDB initialized');
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
          db.createObjectStore(AUDIO_FILES_STORE, { keyPath: 'url' });
        }

        // Store pour les messages
        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const messageStore = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
          messageStore.createIndex('lessonId', 'lessonId', { unique: false });
          messageStore.createIndex('formationId', 'formationId', { unique: false });
          messageStore.createIndex('isPending', 'isPending', { unique: false });
        }

        // Store pour les profils
        if (!db.objectStoreNames.contains(PROFILES_STORE)) {
          const profileStore = db.createObjectStore(PROFILES_STORE, { keyPath: 'id' });
          profileStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Store pour le cache des requêtes React Query
        if (!db.objectStoreNames.contains(QUERY_CACHE_STORE)) {
          const queryStore = db.createObjectStore(QUERY_CACHE_STORE, { keyPath: 'key' });
          queryStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }

        // Store pour les mutations en attente
        if (!db.objectStoreNames.contains(PENDING_MUTATIONS_STORE)) {
          const mutationStore = db.createObjectStore(PENDING_MUTATIONS_STORE, { keyPath: 'id' });
          mutationStore.createIndex('type', 'type', { unique: false });
          mutationStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Failed to initialize database');
    return this.db;
  }

  // ==================== QUERY CACHE ====================

  /**
   * Sauvegarde le résultat d'une requête dans le cache
   */
  async cacheQuery(key: string, data: any, ttlMs: number = 1000 * 60 * 60): Promise<void> {
    const db = await this.ensureDB();
    const cached: CachedQuery = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUERY_CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(QUERY_CACHE_STORE);
      const request = store.put(cached);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère une requête depuis le cache
   */
  async getCachedQuery(key: string): Promise<any | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUERY_CACHE_STORE], 'readonly');
      const store = transaction.objectStore(QUERY_CACHE_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as CachedQuery | undefined;
        // Retourne les données même si expirées (stale-while-revalidate)
        resolve(result?.data || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Vérifie si une requête du cache est encore fraîche
   */
  async isQueryFresh(key: string): Promise<boolean> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUERY_CACHE_STORE], 'readonly');
      const store = transaction.objectStore(QUERY_CACHE_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as CachedQuery | undefined;
        resolve(result ? result.expiresAt > Date.now() : false);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Supprime les requêtes expirées du cache
   */
  async cleanExpiredQueries(): Promise<number> {
    const db = await this.ensureDB();
    const now = Date.now();
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUERY_CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(QUERY_CACHE_STORE);
      const index = store.index('expiresAt');
      const range = IDBKeyRange.upperBound(now);
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
        console.log(`🧹 Cleaned ${deletedCount} expired queries`);
        resolve(deletedCount);
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ==================== PENDING MUTATIONS ====================

  /**
   * Ajoute une mutation en attente (pour sync offline)
   */
  async addPendingMutation(mutation: Omit<PendingMutation, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    const db = await this.ensureDB();
    const id = `mutation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pending: PendingMutation = {
      id,
      ...mutation,
      createdAt: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PENDING_MUTATIONS_STORE], 'readwrite');
      const store = transaction.objectStore(PENDING_MUTATIONS_STORE);
      const request = store.put(pending);

      request.onsuccess = () => {
        console.log('📝 Pending mutation added:', id);
        resolve(id);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère toutes les mutations en attente
   */
  async getPendingMutations(): Promise<PendingMutation[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PENDING_MUTATIONS_STORE], 'readonly');
      const store = transaction.objectStore(PENDING_MUTATIONS_STORE);
      const index = store.index('createdAt');
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result as PendingMutation[]);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Supprime une mutation après synchronisation réussie
   */
  async removePendingMutation(id: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PENDING_MUTATIONS_STORE], 'readwrite');
      const store = transaction.objectStore(PENDING_MUTATIONS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('✅ Pending mutation completed:', id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Incrémente le compteur de retry
   */
  async incrementMutationRetry(id: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PENDING_MUTATIONS_STORE], 'readwrite');
      const store = transaction.objectStore(PENDING_MUTATIONS_STORE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const mutation = getRequest.result as PendingMutation;
        if (mutation) {
          mutation.retryCount++;
          store.put(mutation);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ==================== MESSAGES ====================

  /**
   * Sauvegarde des messages pour accès offline
   */
  async saveMessages(lessonId: string, formationId: string, messages: any[]): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);

      messages.forEach(msg => {
        const offlineMsg: OfflineMessage = {
          id: msg.id,
          lessonId,
          formationId,
          data: msg,
          isPending: false,
          createdAt: new Date(msg.created_at).getTime(),
        };
        store.put(offlineMsg);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Récupère les messages d'une leçon depuis le cache
   */
  async getMessagesByLesson(lessonId: string): Promise<any[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE], 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      const index = store.index('lessonId');
      const request = index.getAll(lessonId);

      request.onsuccess = () => {
        const results = request.result as OfflineMessage[];
        resolve(results.map(r => r.data).sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ));
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Ajoute un message en attente d'envoi
   */
  async addPendingMessage(message: any, lessonId: string, formationId: string): Promise<void> {
    const db = await this.ensureDB();
    const offlineMsg: OfflineMessage = {
      id: message.id || `pending_${Date.now()}`,
      lessonId,
      formationId,
      data: { ...message, is_pending: true },
      isPending: true,
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      const request = store.put(offlineMsg);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== PROFILES ====================

  /**
   * Sauvegarde un profil pour accès offline
   */
  async saveProfile(profile: any): Promise<void> {
    const db = await this.ensureDB();
    const offlineProfile: OfflineProfile = {
      id: profile.id,
      data: profile,
      updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROFILES_STORE], 'readwrite');
      const store = transaction.objectStore(PROFILES_STORE);
      const request = store.put(offlineProfile);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère un profil depuis le cache
   */
  async getProfile(profileId: string): Promise<any | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROFILES_STORE], 'readonly');
      const store = transaction.objectStore(PROFILES_STORE);
      const request = store.get(profileId);

      request.onsuccess = () => {
        const result = request.result as OfflineProfile | undefined;
        resolve(result?.data || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== FORMATIONS (existing) ====================

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

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

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

  // ==================== LESSONS (existing) ====================

  async saveLesson(lesson: any, audioBlob?: Blob): Promise<void> {
    const db = await this.ensureDB();
    const offlineLesson: OfflineLesson = {
      id: lesson.id,
      formationId: lesson.formation_id || lesson.level?.formation_id,
      data: lesson,
      audioBlob,
      audioUrl: lesson.audio_url,
      downloadedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([LESSONS_STORE], 'readwrite');
      const store = transaction.objectStore(LESSONS_STORE);
      const request = store.put(offlineLesson);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getLesson(lessonId: string): Promise<any | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([LESSONS_STORE], 'readonly');
      const store = transaction.objectStore(LESSONS_STORE);
      const request = store.get(lessonId);

      request.onsuccess = () => {
        const result = request.result as OfflineLesson | undefined;
        if (result?.audioBlob) {
          result.data.offlineAudioUrl = URL.createObjectURL(result.audioBlob);
        }
        resolve(result?.data || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

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

        request.onsuccess = () => resolve(blob);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error downloading audio:', error);
      return null;
    }
  }

  async deleteFormation(formationId: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise(async (resolve, reject) => {
      try {
        const lessons = await this.getLessonsByFormation(formationId);
        const transaction = db.transaction([FORMATIONS_STORE, LESSONS_STORE], 'readwrite');
        
        const formationStore = transaction.objectStore(FORMATIONS_STORE);
        formationStore.delete(formationId);

        const lessonStore = transaction.objectStore(LESSONS_STORE);
        lessons.forEach(lesson => lessonStore.delete(lesson.id));

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async isFormationOffline(formationId: string): Promise<boolean> {
    const formation = await this.getFormation(formationId);
    return formation !== null;
  }

  async getCacheSize(): Promise<number> {
    if (!navigator.storage || !navigator.storage.estimate) return 0;
    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }

  /**
   * Nettoie toutes les données périmées
   */
  async cleanupOldData(maxAgeDays: number = 30): Promise<void> {
    await this.cleanExpiredQueries();
    // Pourrait aussi nettoyer les vieilles formations non synchronisées
    console.log('🧹 Cleanup completed');
  }
}

export const offlineStore = new OfflineStore();
offlineStore.init().catch(console.error);
