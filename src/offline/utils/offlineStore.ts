/**
 * Stockage IndexedDB étendu pour l'architecture offline-first
 * Gère le cache de toutes les données de l'application
 */

const DB_NAME = 'offline_content';
const DB_VERSION = 3; // V3: ajout du store user_progress pour la progression offline
const FORMATIONS_STORE = 'formations';
const LESSONS_STORE = 'lessons';
const AUDIO_FILES_STORE = 'audio_files';
const MESSAGES_STORE = 'messages';
const PROFILES_STORE = 'profiles';
const QUERY_CACHE_STORE = 'query_cache';
const PENDING_MUTATIONS_STORE = 'pending_mutations';
const USER_PROGRESS_STORE = 'user_progress';

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
  type: 'message' | 'reaction' | 'progress' | 'profile' | 'grade' | 'attendance' | 'payment' | 'note' | 'transfer' | 'return' | 'update_boutique_product' | 'delete_boutique_product' | 'create_boutique_sale' | 'cancel_boutique_sale' | 'generic';
  payload: any;
  createdAt: number;
  retryCount: number;
  priority: 'high' | 'normal' | 'low';
  serverVersion?: number; // Version du serveur au moment de la création
  conflictResolved?: boolean;
}

/**
 * Progression offline d'un utilisateur pour une leçon
 */
interface OfflineUserProgress {
  id: string; // `${userId}_${lessonId}`
  userId: string;
  lessonId: string;
  formationId: string;
  levelId: string;
  levelOrderIndex: number;
  lessonOrderIndex: number;
  status: 'not_started' | 'in_progress' | 'awaiting_review' | 'completed';
  exerciseCompleted: boolean;
  completedAt?: string;
  savedAt: number;
}

class OfflineStore {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  // Miroir mémoire pour les requêtes cachées : permet une lecture *synchrone*
  // dès le premier rendu, donc plus aucun spinner si une donnée est déjà connue.
  private queryMemoryCache: Map<string, any> = new Map();
  // Miroir mémoire pour les profils utilisateurs (lecture synchrone également).
  private profileMemoryCache: Map<string, any> = new Map();
  private warmupPromise: Promise<void> | null = null;

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

        // Store pour la progression utilisateur (V3)
        if (!db.objectStoreNames.contains(USER_PROGRESS_STORE)) {
          const progressStore = db.createObjectStore(USER_PROGRESS_STORE, { keyPath: 'id' });
          progressStore.createIndex('userId', 'userId', { unique: false });
          progressStore.createIndex('formationId', 'formationId', { unique: false });
          progressStore.createIndex('userFormation', ['userId', 'formationId'], { unique: false });
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
   * Sauvegarde le résultat d'une requête dans le cache (mémoire + IndexedDB).
   * Le miroir mémoire est mis à jour immédiatement pour permettre des lectures
   * synchrones ultérieures.
   */
  async cacheQuery(key: string, data: any, ttlMs: number = 1000 * 60 * 60): Promise<void> {
    // Miroir mémoire mis à jour synchrone
    this.queryMemoryCache.set(key, data);

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
   * Lecture *synchrone* d'une requête cachée depuis le miroir mémoire.
   * Renvoie `null` si rien n'est connu — appeler `getCachedQuery` (async)
   * pour interroger IndexedDB en complément.
   */
  getCachedQuerySync(key: string): any | null {
    return this.queryMemoryCache.get(key) ?? null;
  }

  /**
   * Récupère une requête depuis le cache (mémoire d'abord, puis IndexedDB).
   * Met à jour le miroir mémoire au passage pour les prochaines lectures sync.
   */
  async getCachedQuery(key: string): Promise<any | null> {
    const inMemory = this.queryMemoryCache.get(key);
    if (inMemory !== undefined) return inMemory;

    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUERY_CACHE_STORE], 'readonly');
      const store = transaction.objectStore(QUERY_CACHE_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as CachedQuery | undefined;
        if (result?.data !== undefined) {
          this.queryMemoryCache.set(key, result.data);
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Pré-charge tout le cache de requêtes dans le miroir mémoire au démarrage,
   * pour que les écrans puissent afficher leurs données instantanément au
   * premier rendu (style WhatsApp / Telegram).
   */
  async warmupMemoryMirrors(): Promise<void> {
    if (this.warmupPromise) return this.warmupPromise;
    this.warmupPromise = (async () => {
      try {
        const db = await this.ensureDB();
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(
            [QUERY_CACHE_STORE, PROFILES_STORE],
            'readonly',
          );
          const queryStore = transaction.objectStore(QUERY_CACHE_STORE);
          const queryReq = queryStore.openCursor();
          let queryCount = 0;
          queryReq.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result;
            if (cursor) {
              const cached = cursor.value as CachedQuery;
              if (cached?.data !== undefined) {
                this.queryMemoryCache.set(cached.key, cached.data);
                queryCount++;
              }
              cursor.continue();
            }
          };

          const profileStore = transaction.objectStore(PROFILES_STORE);
          const profileReq = profileStore.openCursor();
          let profileCount = 0;
          profileReq.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result;
            if (cursor) {
              const profile = cursor.value as OfflineProfile;
              if (profile?.id && profile?.data) {
                this.profileMemoryCache.set(profile.id, profile.data);
                profileCount++;
              }
              cursor.continue();
            }
          };

          transaction.oncomplete = () => {
            if (queryCount > 0 || profileCount > 0) {
              console.log(
                `🔥 Offline mirror warmed up: ${queryCount} queries, ${profileCount} profiles`,
              );
            }
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        });
      } catch (err) {
        console.error('Error warming up offline memory mirrors:', err);
      }
    })();
    return this.warmupPromise;
  }

  /**
   * Lecture *synchrone* d'un profil depuis le miroir mémoire.
   */
  getProfileSync(profileId: string): any | null {
    return this.profileMemoryCache.get(profileId) ?? null;
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
  async addPendingMutation(mutation: Omit<PendingMutation, 'id' | 'createdAt' | 'retryCount' | 'priority'> & { priority?: 'high' | 'normal' | 'low' }): Promise<string> {
    const db = await this.ensureDB();
    const id = `mutation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pending: PendingMutation = {
      id,
      ...mutation,
      priority: mutation.priority || 'normal',
      createdAt: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PENDING_MUTATIONS_STORE], 'readwrite');
      const store = transaction.objectStore(PENDING_MUTATIONS_STORE);
      const request = store.put(pending);

      request.onsuccess = () => {
        console.log('📝 Pending mutation added:', id, 'priority:', pending.priority);
        resolve(id);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère toutes les mutations en attente triées par priorité
   */
  async getPendingMutations(): Promise<PendingMutation[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PENDING_MUTATIONS_STORE], 'readonly');
      const store = transaction.objectStore(PENDING_MUTATIONS_STORE);
      const index = store.index('createdAt');
      const request = index.getAll();

      request.onsuccess = () => {
        const mutations = request.result as PendingMutation[];
        // Trier par priorité (high > normal > low), puis par retryCount, puis par createdAt
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        mutations.sort((a, b) => {
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          const retryDiff = a.retryCount - b.retryCount;
          if (retryDiff !== 0) return retryDiff;
          return a.createdAt - b.createdAt;
        });
        resolve(mutations);
      };
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

  // ==================== USER PROGRESS (V3) ====================

  /**
   * Sauvegarde la progression d'un utilisateur pour une leçon
   */
  async saveUserProgress(progress: Omit<OfflineUserProgress, 'id' | 'savedAt'>): Promise<void> {
    const db = await this.ensureDB();
    const entry: OfflineUserProgress = {
      id: `${progress.userId}_${progress.lessonId}`,
      ...progress,
      savedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([USER_PROGRESS_STORE], 'readwrite');
      const store = transaction.objectStore(USER_PROGRESS_STORE);
      store.put(entry);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Sauvegarde la progression complète d'un utilisateur pour une formation
   */
  async saveUserProgressBatch(progressList: Omit<OfflineUserProgress, 'id' | 'savedAt'>[]): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([USER_PROGRESS_STORE], 'readwrite');
      const store = transaction.objectStore(USER_PROGRESS_STORE);

      for (const progress of progressList) {
        const entry: OfflineUserProgress = {
          id: `${progress.userId}_${progress.lessonId}`,
          ...progress,
          savedAt: Date.now(),
        };
        store.put(entry);
      }

      transaction.oncomplete = () => {
        console.log(`📊 Saved ${progressList.length} progress entries offline`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Récupère la progression d'un utilisateur pour une formation
   */
  async getUserProgressByFormation(userId: string, formationId: string): Promise<OfflineUserProgress[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([USER_PROGRESS_STORE], 'readonly');
      const store = transaction.objectStore(USER_PROGRESS_STORE);
      const index = store.index('userFormation');
      const request = index.getAll([userId, formationId]);

      request.onsuccess = () => resolve(request.result as OfflineUserProgress[]);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère le niveau maximum atteint par un utilisateur dans une formation (offline)
   */
  async getUserMaxProgress(userId: string, formationId: string): Promise<{
    levelOrder: number;
    lessonOrder: number;
    status: string;
  }> {
    const progressList = await this.getUserProgressByFormation(userId, formationId);

    if (progressList.length === 0) {
      return { levelOrder: 0, lessonOrder: 0, status: 'not_started' };
    }

    // Trouver la progression la plus avancée
    let maxLevel = 0;
    let maxLesson = 0;
    let lastStatus = 'not_started';

    for (const p of progressList) {
      if (p.levelOrderIndex > maxLevel ||
        (p.levelOrderIndex === maxLevel && p.lessonOrderIndex > maxLesson)) {
        maxLevel = p.levelOrderIndex;
        maxLesson = p.lessonOrderIndex;
        lastStatus = p.status;
      }
    }

    return { levelOrder: maxLevel, lessonOrder: maxLesson, status: lastStatus };
  }

  // ==================== FORMATIONS (existing) ====================

  async saveFormation(formation: any): Promise<void> {
    // Vérifier le quota avant d'ajouter
    await this.checkStorageQuota();
    
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
   * Vérifie l'utilisation du stockage et retourne le pourcentage utilisé
   */
  async getStorageUsage(): Promise<{ used: number; quota: number; percentage: number }> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { used: 0, quota: 0, percentage: 0 };
    }
    
    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (used / quota) * 100 : 0;
    
    return { used, quota, percentage };
  }

  /**
   * Vérifie si le stockage est presque plein et nettoie si nécessaire
   */
  async checkStorageQuota(): Promise<void> {
    const { percentage } = await this.getStorageUsage();
    
    // Alertes selon l'utilisation
    if (percentage > 90) {
      console.warn('⚠️ Storage usage critical:', percentage.toFixed(1) + '%');
      await this.emergencyCleanup();
    } else if (percentage > 75) {
      console.warn('⚠️ Storage usage high:', percentage.toFixed(1) + '%');
      await this.cleanupOldData(7); // Nettoyer les données de plus de 7 jours
    }
  }

  /**
   * Nettoyage d'urgence quand le stockage est critique
   */
  private async emergencyCleanup(): Promise<void> {
    console.log('🧹 Emergency cleanup triggered');
    
    const db = await this.ensureDB();
    
    // Supprimer les formations les plus anciennes
    const formations = await this.getAllFormations();
    if (formations.length > 3) {
      // Garder seulement les 3 formations les plus récentes
      const sortedByDate = formations.sort((a, b) => a.downloadedAt - b.downloadedAt);
      const toDelete = sortedByDate.slice(0, formations.length - 3);
      
      for (const formation of toDelete) {
        await this.deleteFormation(formation.id);
        console.log('🗑️ Deleted formation for emergency cleanup:', formation.id);
      }
    }
    
    // Nettoyer les queries expirées
    await this.cleanExpiredQueries();
    
    // Nettoyer les mutations en attente abandonnées (retryCount > 15)
    const mutations = await this.getPendingMutations();
    const abandonedMutations = mutations.filter(m => m.retryCount > 15);
    
    for (const mutation of abandonedMutations) {
      await this.removePendingMutation(mutation.id);
      console.log('🗑️ Deleted abandoned mutation:', mutation.id);
    }
    
    // Nettoyer le cache Service Worker
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        if (cacheName.includes('images-cache') || cacheName.includes('supabase-api-cache')) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          // Supprimer la moitié des entrées les plus anciennes
          const toDelete = keys.slice(0, Math.floor(keys.length / 2));
          for (const key of toDelete) {
            await cache.delete(key);
          }
          console.log('🗑️ Cleaned cache:', cacheName, 'deleted', toDelete.length, 'entries');
        }
      }
    }
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
offlineStore
  .init()
  .then(() => offlineStore.warmupMemoryMirrors())
  .catch(console.error);
