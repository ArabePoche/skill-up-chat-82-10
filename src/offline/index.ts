/**
 * Module de gestion offline-first
 * Permet le fonctionnement complet hors connexion de l'application
 */

// Stores et utilitaires
export { offlineStore } from './utils/offlineStore';
export { syncManager } from './utils/syncManager';
export { 
  hashQueryKey, 
  persistQuery, 
  getPersistedQuery, 
  shouldPersistQuery 
} from './utils/queryPersister';

// Hooks
export { useOfflineSync } from './hooks/useOfflineSync';
export { useOfflineFormation } from './hooks/useOfflineFormation';
export { useOfflineFormations } from './hooks/useOfflineFormations';
export { useOfflineQuery, useOfflineData } from './hooks/useOfflineQuery';
export { useOfflineMutation, useSyncPendingMutations } from './hooks/useOfflineMutation';
export { useFirstRun } from './hooks/useFirstRun';

// Composants
export { OfflineIndicator } from './components/OfflineIndicator';
export { OfflineDownloadButton } from './components/OfflineDownloadButton';
export { OfflineGate } from './components/OfflineGate';
export { ConnectionRequiredScreen } from './components/ConnectionRequiredScreen';
