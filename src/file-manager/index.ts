/**
 * Module de gestion intelligente des fichiers - Architecture Offline-First
 * 
 * PRINCIPE FONDAMENTAL:
 * 📌 Supabase = source de téléchargement initial UNIQUEMENT
 * 📌 Stockage local (IndexedDB) = source réelle d'affichage
 * 📌 Cache mémoire = accès instantané sans vérification filesystem
 * 📌 Galerie (Android/iOS) = visibilité dans Photos pour images/vidéos
 * 
 * ARCHITECTURE OPTIMISÉE:
 * ✅ Cache mémoire pour éviter les vérifications répétées
 * ✅ Vérification IndexedDB une seule fois au montage
 * ✅ Pas de vérification au scroll/render
 * ✅ Préchargement du cache au démarrage de l'app
 */

// Types
export * from './types';

// Stores
export { fileStore } from './stores/FileStore';
export { fileStatusCache } from './stores/FileStatusCache';

// Utils
export { 
  saveMediaToDevice,
  saveImageToGallery,
  saveVideoToGallery,
  saveAudioToDevice,
  saveDocumentToDevice,
  isNativePlatform,
  getMediaType,
  generateFileName,
  ensureAlbumExists,
} from './utils/mediaGallery';
export type { SaveToGalleryResult, MediaType } from './utils/mediaGallery';

// Hooks
export { useFileDownload } from './hooks/useFileDownload';
export { useMediaDownload } from './hooks/useMediaDownload';
export type { MediaDownloadResult, UseMediaDownloadReturn } from './hooks/useMediaDownload';
export { useOfflineMedia } from './hooks/useOfflineMedia';
export type { UseOfflineMediaReturn } from './hooks/useOfflineMedia';
export { useNetworkStatus } from './hooks/useNetworkStatus';
export { useFileStorageManager } from './hooks/useFileStorageManager';
export { useCachePreloader, preloadCacheForUrls } from './hooks/useCachePreloader';

// Composants Offline-First
export { OfflineImage } from './components/OfflineImage';
export { OfflineAudio } from './components/OfflineAudio';
export { OfflineVideo } from './components/OfflineVideo';
export { OfflineDocument } from './components/OfflineDocument';

// Composants utilitaires
export { SmartFilePreview } from './components/SmartFilePreview';
export { FileStorageIndicator } from './components/FileStorageIndicator';
export { MediaDownloadButton } from './components/MediaDownloadButton';
