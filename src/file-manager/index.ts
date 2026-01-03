/**
 * Module de gestion intelligente des fichiers - Architecture Offline-First
 * 
 * PRINCIPE FONDAMENTAL:
 * 📌 Supabase = source de téléchargement initial UNIQUEMENT
 * 📌 Stockage local (IndexedDB) = source réelle d'affichage
 * 📌 Galerie (Android/iOS) = visibilité dans Photos pour images/vidéos
 * 
 * Fonctionnalités :
 * - Téléchargement depuis Supabase vers stockage local
 * - Sauvegarde dans la galerie Android/iOS (type WhatsApp)
 * - Affichage exclusif depuis URLs locales (blob:)
 * - Vérification de présence locale à chaque rendu
 * - Gestion du mode hors ligne
 * - Nettoyage automatique des anciens fichiers
 */

// Types
export * from './types';

// Stores
export { fileStore } from './stores/FileStore';

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
export { useNetworkStatus } from './hooks/useNetworkStatus';
export { useFileStorageManager } from './hooks/useFileStorageManager';

// Composants Offline-First
export { OfflineImage } from './components/OfflineImage';
export { OfflineAudio } from './components/OfflineAudio';
export { OfflineVideo } from './components/OfflineVideo';
export { OfflineDocument } from './components/OfflineDocument';

// Composants utilitaires
export { SmartFilePreview } from './components/SmartFilePreview';
export { FileStorageIndicator } from './components/FileStorageIndicator';
export { MediaDownloadButton } from './components/MediaDownloadButton';
