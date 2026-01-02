/**
 * Service de stockage local des messages via IndexedDB
 * Optimise la performance en réduisant les requêtes réseau
 */

const DB_NAME = 'messages_cache';
const DB_VERSION = 1;
const STORE_NAME = 'lesson_messages';
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

interface CachedMessages {
  key: string;
  messages: any[];
  timestamp: number;
  formationId: string;
  lessonId: string;
}

class LocalMessageStore {
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
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          objectStore.createIndex('formationId', 'formationId', { unique: false });
          objectStore.createIndex('lessonId', 'lessonId', { unique: false });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize database');
    }
    return this.db;
  }

  /**
   * Génère une clé unique pour le cache
   */
  private getCacheKey(lessonId: string, formationId: string, userId: string): string {
    return `${formationId}_${lessonId}_${userId}`;
  }

  /**
   * Récupère les messages du cache local
   * @param ignoreExpiry - Si true, retourne les messages même s'ils sont expirés (utile pour le mode offline)
   */
  async getMessages(
    lessonId: string,
    formationId: string,
    userId: string,
    ignoreExpiry: boolean = false
  ): Promise<any[] | null> {
    try {
      const db = await this.ensureDB();
      const key = this.getCacheKey(lessonId, formationId, userId);

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.get(key);

        request.onsuccess = () => {
          const result = request.result as CachedMessages | undefined;
          
          if (!result) {
            resolve(null);
            return;
          }

          // Vérifier si le cache est encore valide (sauf si ignoreExpiry)
          const isExpired = Date.now() - result.timestamp > CACHE_DURATION;
          
          if (isExpired && !ignoreExpiry) {
            // Cache expiré, le supprimer
            this.deleteMessages(lessonId, formationId, userId);
            resolve(null);
          } else {
            console.log('📦 Messages loaded from cache:', result.messages.length, ignoreExpiry ? '(offline mode)' : '');
            resolve(result.messages);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting cached messages:', error);
      return null;
    }
  }

  /**
   * Sauvegarde les messages dans le cache local
   */
  async saveMessages(
    lessonId: string,
    formationId: string,
    userId: string,
    messages: any[]
  ): Promise<void> {
    try {
      const db = await this.ensureDB();
      const key = this.getCacheKey(lessonId, formationId, userId);

      const cachedData: CachedMessages = {
        key,
        messages,
        timestamp: Date.now(),
        formationId,
        lessonId,
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.put(cachedData);

        request.onsuccess = () => {
          console.log('💾 Messages saved to cache:', messages.length);
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error saving messages to cache:', error);
    }
  }

  /**
   * Supprime les messages du cache
   */
  async deleteMessages(
    lessonId: string,
    formationId: string,
    userId: string
  ): Promise<void> {
    try {
      const db = await this.ensureDB();
      const key = this.getCacheKey(lessonId, formationId, userId);

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error deleting cached messages:', error);
    }
  }

  /**
   * Nettoie les caches expirés
   */
  async cleanExpiredCache(): Promise<void> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.openCursor();

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor) {
            const data = cursor.value as CachedMessages;
            const isExpired = Date.now() - data.timestamp > CACHE_DURATION;
            
            if (isExpired) {
              cursor.delete();
            }
            
            cursor.continue();
          } else {
            resolve();
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error cleaning expired cache:', error);
    }
  }

  /**
   * Vide tout le cache
   */
  async clearAllCache(): Promise<void> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.clear();

        request.onsuccess = () => {
          console.log('🧹 All cache cleared');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

// Instance singleton
export const localMessageStore = new LocalMessageStore();

// Initialiser au chargement
localMessageStore.init().catch(console.error);

// Nettoyer les caches expirés toutes les heures
setInterval(() => {
  localMessageStore.cleanExpiredCache().catch(console.error);
}, 1000 * 60 * 60);
