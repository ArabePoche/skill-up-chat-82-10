/**
 * Types pour la gestion intelligente des fichiers (logique WhatsApp)
 * Téléchargement manuel, stockage local, vérification de présence
 * 
 * AMÉLIORATION v2:
 * ✅ fileId comme clé stable (remplace remoteUrl comme clé unique)
 * ✅ Statut 'downloading' et 'error' ajoutés
 */

// État d'un fichier distant
export type FileDownloadStatus = 
  | 'checking'             // ⚡ Vérification locale en cours (ne pas afficher bouton télécharger)
  | 'remote'               // Fichier distant, non téléchargé
  | 'downloading'          // Téléchargement en cours
  | 'downloaded'           // Téléchargé et disponible localement
  | 'error'                // Erreur de téléchargement
  | 'offline_unavailable'; // Hors ligne et non téléchargé

// Métadonnées d'un fichier stocké localement
export interface LocalFileMetadata {
  /** ID stable unique du fichier (indépendant de l'URL) */
  id: string;
  /** Clé stable pour le cache/IndexedDB (préférer à remoteUrl) */
  fileId: string;
  /** URL distante originale (peut changer/expirer) */
  remoteUrl: string;
  /** Chemin local (IndexedDB key ou Filesystem path) */
  localPath: string;
  /** Nom du fichier */
  fileName: string;
  /** MIME type */
  fileType: string;
  /** Taille en bytes */
  fileSize: number;
  /** Timestamp du téléchargement */
  downloadedAt: number;
  /** Dernier accès */
  lastAccessedAt: number;
  /** ID du propriétaire du fichier */
  ownerId?: string;
  /** Si c'est un fichier de l'utilisateur courant */
  isOwnFile: boolean;
}

// Entrée du registre des fichiers
export interface FileRegistryEntry {
  id: string;
  fileId: string;
  remoteUrl: string;
  metadata: LocalFileMetadata;
  blob?: Blob;
}

// Props pour le composant d'affichage de fichier
export interface SmartFilePreviewProps {
  /** ID stable du fichier (préféré) */
  fileId?: string;
  /** URL distante du fichier (fallback si pas de fileId) */
  fileUrl: string;
  /** Nom du fichier */
  fileName: string;
  /** MIME type */
  fileType: string;
  /** Taille (optionnel) */
  fileSize?: number;
  /** ID du propriétaire */
  ownerId?: string;
  className?: string;
  showFileName?: boolean;
  onDownloadComplete?: () => void;
  onError?: (error: Error) => void;
}

// Configuration du gestionnaire de fichiers
export interface FileManagerConfig {
  /** Espace max en MB */
  maxStorageMB: number;
  /** Nettoyer les fichiers non accédés après X jours */
  autoCleanupDays: number;
  /** Utiliser Capacitor Filesystem si disponible */
  enableCapacitorStorage: boolean;
  /** Activer la persistance du cache mémoire en sessionStorage */
  enableSessionPersistence: boolean;
  /** Nombre max de fichiers à précharger au démarrage */
  maxPreloadFiles: number;
}

export const DEFAULT_FILE_MANAGER_CONFIG: FileManagerConfig = {
  maxStorageMB: 500,
  autoCleanupDays: 30,
  enableCapacitorStorage: true,
  enableSessionPersistence: true,
  maxPreloadFiles: 100, // Précharger les 100 fichiers les plus récents
};

// Stats de stockage
export interface FileStorageStats {
  totalFiles: number;
  totalSizeBytes: number;
  oldestFile?: LocalFileMetadata;
  newestFile?: LocalFileMetadata;
}

// Options de préchargement partiel
export interface PreloadStrategy {
  /** Charger les fichiers récemment utilisés */
  recentlyUsed?: number;
  /** Charger les fichiers favoris */
  favorites?: boolean;
  /** Charger les fichiers d'une leçon spécifique */
  lessonId?: string;
  /** Charger uniquement les fichiers de l'utilisateur */
  ownFilesOnly?: boolean;
}
