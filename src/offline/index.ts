/**
 * Module de gestion offline
 * Permet le fonctionnement hors connexion de l'application
 */

export { offlineStore } from './utils/offlineStore';
export { syncManager } from './utils/syncManager';
export { useOfflineSync } from './hooks/useOfflineSync';
export { useOfflineFormation } from './hooks/useOfflineFormation';
export { OfflineIndicator } from './components/OfflineIndicator';
export { OfflineDownloadButton } from './components/OfflineDownloadButton';
