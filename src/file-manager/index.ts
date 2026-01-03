/**
 * Module de gestion intelligente des fichiers (logique WhatsApp)
 * 
 * Fonctionnalités :
 * - Téléchargement manuel des fichiers distants
 * - Stockage local avec IndexedDB
 * - Vérification de présence réelle à chaque rendu
 * - Gestion du mode hors ligne
 * - Nettoyage automatique des anciens fichiers
 */

// Types
export * from './types';

// Stores
export { fileStore } from './stores/FileStore';

// Hooks
export { useFileDownload } from './hooks/useFileDownload';
export { useNetworkStatus } from './hooks/useNetworkStatus';
export { useFileStorageManager } from './hooks/useFileStorageManager';

// Components
export { SmartFilePreview } from './components/SmartFilePreview';
export { FileStorageIndicator } from './components/FileStorageIndicator';
