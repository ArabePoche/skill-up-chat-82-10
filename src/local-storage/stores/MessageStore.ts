/**
 * Store IndexedDB pour les messages de conversation
 * Gestion des messages avec support offline et sync différentielle
 */

import { StoredMessage, StoredConversation } from '../types';

const DB_NAME = 'whatsapp_messages';
const DB_VERSION = 1;
const MESSAGES_STORE = 'messages';
const CONVERSATIONS_STORE = 'conversations';
const PENDING_STORE = 'pending_messages';

class MessageStore {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        console.log('💬 MessageStore initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Messages store
        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const store = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
          store.createIndex('conversationKey', 'conversationKey', { unique: false });
          store.createIndex('senderId', 'senderId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('isPending', 'isPending', { unique: false });
          store.createIndex('serverSynced', 'serverSynced', { unique: false });
        }

        // Conversations store
        if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
          const store = db.createObjectStore(CONVERSATIONS_STORE, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('lastMessageAt', 'lastMessageAt', { unique: false });
          store.createIndex('formationId', 'formationId', { unique: false });
        }

        // Pending messages (pour sync)
        if (!db.objectStoreNames.contains(PENDING_STORE)) {
          const store = db.createObjectStore(PENDING_STORE, { keyPath: 'localId' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('MessageStore not initialized');
    return this.db;
  }

  // ==================== MESSAGES ====================

  /**
   * Génère une clé de conversation
   */
  getConversationKey(lessonId: string, formationId: string, userId?: string): string {
    if (userId) {
      return `lesson_${formationId}_${lessonId}_${userId}`;
    }
    return `lesson_${formationId}_${lessonId}`;
  }

  /**
   * Sauvegarde un lot de messages (optimisé pour économie de données)
   */
  async saveMessages(messages: StoredMessage[]): Promise<void> {
    if (messages.length === 0) return;

    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);

      messages.forEach(msg => store.put(msg));

      transaction.oncomplete = () => {
        console.log(`💾 ${messages.length} messages saved locally`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Récupère les messages d'une conversation
   */
  async getMessagesByConversation(
    conversationKey: string,
    limit?: number
  ): Promise<StoredMessage[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE], 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      const index = store.index('conversationKey');
      const request = index.getAll(conversationKey);

      request.onsuccess = () => {
        let messages = request.result as StoredMessage[];
        
        // Tri par date
        messages.sort((a, b) => a.createdAt - b.createdAt);
        
        // Limite optionnelle
        if (limit && messages.length > limit) {
          messages = messages.slice(-limit);
        }
        
        resolve(messages);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère les messages d'une leçon
   */
  async getMessagesByLesson(
    lessonId: string,
    formationId: string,
    userId?: string
  ): Promise<StoredMessage[]> {
    const key = this.getConversationKey(lessonId, formationId, userId);
    return this.getMessagesByConversation(key);
  }

  /**
   * Ajoute un message en attente d'envoi (mode offline)
   */
  async addPendingMessage(message: Omit<StoredMessage, 'serverSynced'>): Promise<string> {
    const db = await this.ensureDB();
    const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const storedMessage: StoredMessage = {
      ...message,
      id: localId,
      localId,
      isPending: true,
      serverSynced: false,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE, PENDING_STORE], 'readwrite');
      
      // Sauvegarder dans les messages
      const msgStore = transaction.objectStore(MESSAGES_STORE);
      msgStore.put(storedMessage);

      // Sauvegarder dans pending pour sync
      const pendingStore = transaction.objectStore(PENDING_STORE);
      pendingStore.put({
        localId,
        message: storedMessage,
        createdAt: Date.now(),
      });

      transaction.oncomplete = () => {
        console.log('📝 Pending message added:', localId);
        resolve(localId);
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Marque un message comme synchronisé
   */
  async markMessageSynced(localId: string, serverId: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE, PENDING_STORE], 'readwrite');

      // Mettre à jour le message
      const msgStore = transaction.objectStore(MESSAGES_STORE);
      const getRequest = msgStore.get(localId);

      getRequest.onsuccess = () => {
        const message = getRequest.result as StoredMessage;
        if (message) {
          message.id = serverId;
          message.isPending = false;
          message.serverSynced = true;
          msgStore.put(message);
          
          // Supprimer de l'ancien ID
          if (localId !== serverId) {
            msgStore.delete(localId);
          }
        }
      };

      // Supprimer du pending
      const pendingStore = transaction.objectStore(PENDING_STORE);
      pendingStore.delete(localId);

      transaction.oncomplete = () => {
        console.log('✅ Message synced:', localId, '->', serverId);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Récupère tous les messages en attente de sync
   */
  async getPendingMessages(): Promise<StoredMessage[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PENDING_STORE], 'readonly');
      const store = transaction.objectStore(PENDING_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const pending = request.result || [];
        resolve(pending.map((p: any) => p.message));
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère le dernier message d'une conversation
   */
  async getLastMessageTime(conversationKey: string): Promise<number | null> {
    const messages = await this.getMessagesByConversation(conversationKey);
    if (messages.length === 0) return null;
    return messages[messages.length - 1].createdAt;
  }

  // ==================== CONVERSATIONS ====================

  /**
   * Sauvegarde ou met à jour une conversation
   */
  async saveConversation(conversation: StoredConversation): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONVERSATIONS_STORE], 'readwrite');
      const store = transaction.objectStore(CONVERSATIONS_STORE);
      store.put(conversation);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Récupère toutes les conversations
   */
  async getAllConversations(): Promise<StoredConversation[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONVERSATIONS_STORE], 'readonly');
      const store = transaction.objectStore(CONVERSATIONS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const conversations = request.result as StoredConversation[];
        // Tri par dernier message
        conversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
        resolve(conversations);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère une conversation
   */
  async getConversation(id: string): Promise<StoredConversation | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONVERSATIONS_STORE], 'readonly');
      const store = transaction.objectStore(CONVERSATIONS_STORE);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== NETTOYAGE ====================

  /**
   * Supprime les vieux messages (économie de stockage)
   */
  async cleanOldMessages(maxAgeDays: number = 90): Promise<number> {
    const db = await this.ensureDB();
    const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      const index = store.index('createdAt');
      const range = IDBKeyRange.upperBound(cutoff);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const msg = cursor.value as StoredMessage;
          // Ne pas supprimer les messages pending
          if (!msg.isPending) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        console.log(`🧹 Cleaned ${deletedCount} old messages`);
        resolve(deletedCount);
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Compte le nombre de messages stockés
   */
  async getMessageCount(): Promise<number> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE], 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Vide tout le stockage
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [MESSAGES_STORE, CONVERSATIONS_STORE, PENDING_STORE],
        'readwrite'
      );

      transaction.objectStore(MESSAGES_STORE).clear();
      transaction.objectStore(CONVERSATIONS_STORE).clear();
      transaction.objectStore(PENDING_STORE).clear();

      transaction.oncomplete = () => {
        console.log('🧹 All messages cleared');
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Singleton
export const messageStore = new MessageStore();
messageStore.init().catch(console.error);
