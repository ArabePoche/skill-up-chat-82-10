/**
 * Store IndexedDB dédié à l'authentification offline-first
 * Permet de garder l'utilisateur connecté même si Supabase est inaccessible
 */

import { User, Session } from '@supabase/supabase-js';

const DB_NAME = 'offline_auth';
const DB_VERSION = 1;
const AUTH_STORE = 'auth_session';
const PROFILE_STORE = 'user_profile';

interface CachedAuth {
  id: 'current';
  user: User;
  session: Session;
  cachedAt: number;
  expiresAt: number;
}

interface CachedProfile {
  id: string;
  data: any;
  cachedAt: number;
}

class AuthStore {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ Failed to open AuthStore IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('🔐 AuthStore IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store pour la session d'authentification
        if (!db.objectStoreNames.contains(AUTH_STORE)) {
          db.createObjectStore(AUTH_STORE, { keyPath: 'id' });
        }

        // Store pour le profil utilisateur
        if (!db.objectStoreNames.contains(PROFILE_STORE)) {
          db.createObjectStore(PROFILE_STORE, { keyPath: 'id' });
        }
      };
    });

    return this.initPromise;
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Failed to initialize auth database');
    return this.db;
  }

  // ==================== SESSION CACHE ====================

  /**
   * Sauvegarde la session utilisateur pour accès offline
   * TTL par défaut: 30 jours (même si le token expire, on garde le cache)
   */
  async saveSession(user: User, session: Session): Promise<void> {
    try {
      const db = await this.ensureDB();
      const cached: CachedAuth = {
        id: 'current',
        user,
        session,
        cachedAt: Date.now(),
        expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 jours
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([AUTH_STORE], 'readwrite');
        const store = transaction.objectStore(AUTH_STORE);
        const request = store.put(cached);

        request.onsuccess = () => {
          console.log('✅ Session cached for offline use');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('❌ Error saving session to cache:', error);
    }
  }

  /**
   * Récupère la session cachée
   */
  async getCachedSession(): Promise<{ user: User; session: Session } | null> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([AUTH_STORE], 'readonly');
        const store = transaction.objectStore(AUTH_STORE);
        const request = store.get('current');

        request.onsuccess = () => {
          const result = request.result as CachedAuth | undefined;
          
          if (!result) {
            resolve(null);
            return;
          }

          // Vérifie si le cache est encore valide (30 jours)
          if (result.expiresAt < Date.now()) {
            console.log('⚠️ Cached session expired');
            this.clearSession();
            resolve(null);
            return;
          }

          console.log('📦 Retrieved cached session for offline use');
          resolve({ user: result.user, session: result.session });
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('❌ Error getting cached session:', error);
      return null;
    }
  }

  /**
   * Supprime la session cachée
   */
  async clearSession(): Promise<void> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([AUTH_STORE], 'readwrite');
        const store = transaction.objectStore(AUTH_STORE);
        const request = store.delete('current');

        request.onsuccess = () => {
          console.log('🗑️ Cached session cleared');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('❌ Error clearing cached session:', error);
    }
  }

  // ==================== PROFILE CACHE ====================

  /**
   * Sauvegarde le profil utilisateur pour accès offline
   */
  async saveProfile(profile: any): Promise<void> {
    try {
      const db = await this.ensureDB();
      const cached: CachedProfile = {
        id: profile.id,
        data: profile,
        cachedAt: Date.now(),
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([PROFILE_STORE], 'readwrite');
        const store = transaction.objectStore(PROFILE_STORE);
        const request = store.put(cached);

        request.onsuccess = () => {
          console.log('✅ Profile cached for offline use');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('❌ Error saving profile to cache:', error);
    }
  }

  /**
   * Récupère le profil caché
   */
  async getCachedProfile(userId: string): Promise<any | null> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([PROFILE_STORE], 'readonly');
        const store = transaction.objectStore(PROFILE_STORE);
        const request = store.get(userId);

        request.onsuccess = () => {
          const result = request.result as CachedProfile | undefined;
          if (result) {
            console.log('📦 Retrieved cached profile for offline use');
          }
          resolve(result?.data || null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('❌ Error getting cached profile:', error);
      return null;
    }
  }

  /**
   * Supprime le profil caché
   */
  async clearProfile(userId: string): Promise<void> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([PROFILE_STORE], 'readwrite');
        const store = transaction.objectStore(PROFILE_STORE);
        const request = store.delete(userId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('❌ Error clearing cached profile:', error);
    }
  }

  /**
   * Nettoie tout le cache d'authentification
   */
  async clearAll(): Promise<void> {
    await this.clearSession();
    try {
      const db = await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([PROFILE_STORE], 'readwrite');
        const store = transaction.objectStore(PROFILE_STORE);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('🗑️ All auth cache cleared');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('❌ Error clearing all auth cache:', error);
    }
  }
}

export const authStore = new AuthStore();
