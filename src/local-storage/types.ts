/**
 * Types pour le stockage local type WhatsApp
 * Gestion des formations et conversations avec économie de données
 */

// ==================== FORMATIONS ====================

export interface StoredFormation {
  id: string;
  data: FormationData;
  downloadedAt: number;
  lastSyncAt: number;
  syncVersion: number; // Pour la sync différentielle
  isFullyDownloaded: boolean;
}

export interface FormationData {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  thumbnail_url?: string;
  author_id?: string;
  levels?: StoredLevel[];
  [key: string]: any;
}

export interface StoredLevel {
  id: string;
  title: string;
  order_index: number;
  lessons: StoredLesson[];
}

export interface StoredLesson {
  id: string;
  title: string;
  description?: string;
  video_url?: string;
  order_index: number;
  exercises?: StoredExercise[];
  // Métadonnées de stockage
  isVideoDownloaded?: boolean;
  isAudioDownloaded?: boolean;
}

export interface StoredExercise {
  id: string;
  title: string;
  description?: string;
  content?: string;
  type?: string;
}

// ==================== MESSAGES / CONVERSATIONS ====================

export interface StoredMessage {
  id: string;
  conversationKey: string; // lessonId_formationId ou sender_receiver
  content: string;
  senderId: string;
  senderProfile?: StoredProfile;
  receiverId?: string;
  createdAt: number;
  isPending: boolean;
  isRead: boolean;
  messageType: 'text' | 'audio' | 'file' | 'image' | 'exercise';
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  // Métadonnées sync
  serverSynced: boolean;
  localId: string; // ID local pour tracking avant sync
}

export interface StoredConversation {
  id: string;
  type: 'lesson' | 'direct' | 'group';
  formationId?: string;
  lessonId?: string;
  promotionId?: string;
  participantIds: string[];
  lastMessageAt: number;
  unreadCount: number;
  lastSyncAt: number;
}

// ==================== PROFILS ====================

export interface StoredProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string;
  role?: string;
  updatedAt: number;
}

// ==================== SYNC ====================

export interface SyncMetadata {
  key: string;
  lastSyncAt: number;
  syncVersion: number;
  serverTimestamp?: string;
}

export interface PendingSyncItem {
  id: string;
  type: 'message' | 'reaction' | 'read_status' | 'progress';
  payload: any;
  createdAt: number;
  retryCount: number;
  lastRetryAt?: number;
}

// ==================== STOCKAGE ====================

export interface StorageStats {
  totalSize: number;
  formationsCount: number;
  messagesCount: number;
  conversationsCount: number;
  pendingSyncCount: number;
  lastCleanupAt: number;
}

export interface StorageConfig {
  maxCacheAgeDays: number;
  maxStorageMB: number;
  enableCompression: boolean;
  syncIntervalMs: number;
  messageRetentionDays: number;
}

export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  maxCacheAgeDays: 30,
  maxStorageMB: 100,
  enableCompression: true,
  syncIntervalMs: 30000, // 30 secondes
  messageRetentionDays: 90,
};
