/**
 * Types pour la gestion intelligente des fichiers (logique WhatsApp)
 * Téléchargement manuel, stockage local, vérification de présence
 */

// État d'un fichier distant
export type FileDownloadStatus = 
  | 'remote'           // Fichier distant, non téléchargé
  | 'downloading'      // Téléchargement en cours
  | 'downloaded'       // Téléchargé et disponible localement
  | 'error'            // Erreur de téléchargement
  | 'offline_unavailable'; // Hors ligne et non téléchargé

// Métadonnées d'un fichier stocké localement
export interface LocalFileMetadata {
  id: string;                    // ID unique du fichier
  remoteUrl: string;             // URL distante originale
  localPath: string;             // Chemin local (IndexedDB key ou Filesystem path)
  fileName: string;              // Nom du fichier
  fileType: string;              // MIME type
  fileSize: number;              // Taille en bytes
  downloadedAt: number;          // Timestamp du téléchargement
  lastAccessedAt: number;        // Dernier accès
  ownerId?: string;              // ID du propriétaire du fichier
  isOwnFile: boolean;            // Si c'est un fichier de l'utilisateur courant
}

// Entrée du registre des fichiers
export interface FileRegistryEntry {
  id: string;
  remoteUrl: string;
  metadata: LocalFileMetadata;
  blob?: Blob;                   // Données du fichier (pour web)
}

// Props pour le composant d'affichage de fichier
export interface SmartFilePreviewProps {
  fileUrl: string;               // URL distante du fichier
  fileName: string;              // Nom du fichier
  fileType: string;              // MIME type
  fileSize?: number;             // Taille (optionnel)
  ownerId?: string;              // ID du propriétaire
  className?: string;
  showFileName?: boolean;
  onDownloadComplete?: () => void;
  onError?: (error: Error) => void;
}

// Configuration du gestionnaire de fichiers
export interface FileManagerConfig {
  maxStorageMB: number;          // Espace max en MB
  autoCleanupDays: number;       // Nettoyer les fichiers non accédés après X jours
  enableCapacitorStorage: boolean; // Utiliser Capacitor Filesystem si disponible
}

export const DEFAULT_FILE_MANAGER_CONFIG: FileManagerConfig = {
  maxStorageMB: 500,
  autoCleanupDays: 30,
  enableCapacitorStorage: true,
};

// Stats de stockage
export interface FileStorageStats {
  totalFiles: number;
  totalSizeBytes: number;
  oldestFile?: LocalFileMetadata;
  newestFile?: LocalFileMetadata;
}
