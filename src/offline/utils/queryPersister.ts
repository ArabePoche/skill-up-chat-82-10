/**
 * Persisteur de cache React Query pour IndexedDB
 * Permet de restaurer le cache au redémarrage de l'app
 */

import { offlineStore } from './offlineStore';

export interface PersistedQuery {
  queryKey: unknown[];
  state: {
    data: unknown;
    dataUpdatedAt: number;
    error: unknown;
    errorUpdatedAt: number;
    status: 'pending' | 'error' | 'success';
  };
}

/**
 * Génère une clé unique pour une queryKey
 */
export const hashQueryKey = (queryKey: unknown[]): string => {
  return JSON.stringify(queryKey);
};

/**
 * Sauvegarde une requête dans le cache persistant
 */
export const persistQuery = async (queryKey: unknown[], data: unknown): Promise<void> => {
  const key = hashQueryKey(queryKey);
  // TTL de 24h par défaut
  await offlineStore.cacheQuery(key, data, 1000 * 60 * 60 * 24);
};

/**
 * Récupère une requête depuis le cache persistant
 */
export const getPersistedQuery = async (queryKey: unknown[]): Promise<unknown | null> => {
  const key = hashQueryKey(queryKey);
  return offlineStore.getCachedQuery(key);
};

/**
 * Vérifie si le cache est encore frais
 */
export const isQueryCacheFresh = async (queryKey: unknown[]): Promise<boolean> => {
  const key = hashQueryKey(queryKey);
  return offlineStore.isQueryFresh(key);
};

/**
 * Configuration pour les requêtes qui doivent être persistées
 * Les clés de requête commençant par ces préfixes seront sauvegardées
 */
export const PERSISTED_QUERY_PREFIXES = [
  'formations',
  'lessons',
  'lesson-messages',
  'user-enrollments',
  'user-profile',
  'profiles',
  'levels',
  'exercises',
  // École & School-OS — préfixes ajoutés pour le mode hors-ligne
  'user-school',
  'user-schools',
  'school',
  'school-search',
  'school-user-role',
  'school-user-permissions',
  'user-extra-permissions',
  'user-permission-exclusions',
  'school-apps',
  'school-translated-apps',
  'school-filtered-apps',
  'school-desktop-folders',
  'school-desktop-settings',
  'school-desktop-app-positions',
  'school-wallpaper',
  'school-classes',
  'school-students',
  'promotion-students',
  'school-teachers',
  'school-personnel',
  'school-staff',
  'school-subjects',
  'school-grades',
  'school-evaluations',
  'school-schedule',
  'school-attendance',
  'school-payments',
  'school-accounting',
  'school-transactions',
  'school-categories',
  'school-scheduled-expenses',
  'school-reports',
  'school-messages',
  'school-mail',
  'school-mail-folders',
  'school-mail-threads',
  'school-settings',
  'school-permissions',
  'school-permission-templates',
  'school-roles',
  'school-years',
  'school-current-year',
  'school-families',
  'school-student-families',
  'school-parent-associations',
  'school-parent-enrollments',
  'school-enrollment',
  'school-bulletins',
  'school-trimesters',
  'school-academic-periods',
  'school-fees',
  'school-payment-methods',
  'school-budget',
  'school-discipline',
  // Page publique du site de l'école (SchoolSitePage)
  'school-site',
  'school-stats',
  'school-template',
  // Page Messages — liste des conversations privées et groupes
  'conversations-list',
  'discussion-groups',
  'unread-counts',
  // Préfixes additionnels utilisés par les composants school-os offline-first
  'parent-enrollment-requests',
  'parent-child-grades',
  'class-students',
  'class-students-cards',
  'class-subjects-data',
  'grading-periods',
  'evaluation-grades-for-class-notes',
  'role-permissions',
  'role-permissions-inherited',
  // Boutique physique — offline-first complet
  'shop-suppliers',
  'supplier-orders',
  'boutique-products',
  'boutique-sales-history',
  'today-sales-stats',
  'inventory-movements',
  'inventory-stats',
  'shop-customers',
  'customer-credits',
  'shop-activity-logs',
  'shop-orders',
  'physical-shop',
  'is-shop-owner',
  'shop-agents',
  'shop-conversations',
  'shop-messages',
  'user-shops',
  'multi-shop-stats',
  'inter-shop-transfers',
  'restock-subscription',
  'my-agent-status',
  'is-shop-agent',
  'pending-agent-requests',
  'available-products-transfer',
  'unread-shop-messages-count',
  'customer-purchases',
  'notifications',
  'discover-shops-for-chat',
] as const;

/**
 * Vérifie si une requête doit être persistée
 */
export const shouldPersistQuery = (queryKey: unknown[]): boolean => {
  if (!queryKey || queryKey.length === 0) return false;
  
  const firstKey = String(queryKey[0]);
  return PERSISTED_QUERY_PREFIXES.some(prefix => firstKey.startsWith(prefix));
};
