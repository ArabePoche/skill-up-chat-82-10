/**
 * Module de gestion intelligente des fichiers - Architecture Offline-First
 * 
 * PRINCIPE FONDAMENTAL:
 * 📌 Supabase = source de téléchargement initial UNIQUEMENT
 * 📌 Stockage local (IndexedDB) = source réelle d'affichage
 * 
 * Fonctionnalités :
 * - Téléchargement depuis Supabase vers stockage local
 * - Affichage exclusif depuis URLs locales (blob:)
 * - Vérification de présence locale à chaque rendu
 * - Gestion du mode hors ligne
 * - Nettoyage automatique des anciens fichiers
 */

// Types
export * from './types';

// Stores
export { fileStore } from './stores/FileStore';

// Hooks
export { useFileDownload } from './hooks/useFileDownload';
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
