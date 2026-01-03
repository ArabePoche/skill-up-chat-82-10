/**
 * Module de stockage local type WhatsApp
 * Gestion offline-first des formations et conversations
 */

// Types
export * from './types';

// Stores
export { messageStore } from './stores/MessageStore';
export { formationStore } from './stores/FormationStore';

// Hooks
export { useLocalMessages } from './hooks/useLocalMessages';
export { useLocalFormations, useLocalFormation } from './hooks/useLocalFormations';
export { useStorageManager } from './hooks/useLocalStorageManager';
