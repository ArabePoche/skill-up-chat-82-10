/**
 * Hook simplifié pour charger un média en mode offline-first
 * Retourne toujours l'URL locale si disponible, sinon déclenche le téléchargement
 * 
 * ARCHITECTURE OFFLINE-FIRST:
 * 📌 Supabase = dépôt distant (téléchargement initial uniquement)
 * 📌 Stockage local = source réelle d'affichage
 *//**
 * Hook simplifié pour charger un média en mode offline-first
 * Retourne toujours l'URL locale si disponible, sinon déclenche le téléchargement
 * 
 * ARCHITECTURE OFFLINE-FIRST:
 * 📌 Supabase = dépôt distant (téléchargement initial uniquement)
 * 📌 IndexedDB = stockage local pour accès offline
 * 📌 Galerie Android/iOS = visibilité dans Photos (images/vidéos)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fileStore } from '../stores/FileStore';
import { useNetworkStatus } from './useNetworkStatus';
import { FileDownloadStatus } from '../types';
import { saveMediaToDevice, isNativePlatform, getMediaType } from '../utils/mediaGallery';

interface UseOfflineMediaOptions {
  /** URL distante du média (Supabase ou autre) */
  remoteUrl: string | null | undefined;
  /** Type MIME du fichier */
  mimeType?: string;
  /** Nom du fichier pour le stockage */
  fileName?: string;
  /** Télécharger automatiquement si non disponible localement */
  autoDownload?: boolean;
  /** Sauvegarder dans la galerie Android/iOS (images/vidéos) */
  saveToGallery?: boolean;
}

interface UseOfflineMediaReturn {
  /** URL à utiliser pour l'affichage (toujours locale si disponible) */
  displayUrl: string | null;
  /** Statut du fichier */
  status: FileDownloadStatus;
  /** Progression du téléchargement (0-100) */
  progress: number;
  /** Le fichier est-il disponible localement ? */
  isLocal: boolean;
  /** Le fichier a été sauvegardé dans la galerie */
  savedToGallery: boolean;
  /** Erreur éventuelle */
  error: Error | null;
  /** Déclencher manuellement le téléchargement */
  download: () => Promise<void>;
  /** Supprimer la copie locale */
  deleteLocal: () => Promise<void>;
}

/**
 * Détermine le type MIME à partir de l'URL
 */
const guessMimeType = (url: string): string => {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || '';
  const mimeMap: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeMap[ext] || 'application/octet-stream';
};

/**
 * Extrait le nom du fichier depuis l'URL
 */
const getFileNameFromUrl = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/');
    return parts[parts.length - 1] || 'file';
  } catch {
    return 'file';
  }
};

export const useOfflineMedia = ({
  remoteUrl,
  mimeType,
  fileName,
  autoDownload = false,
  saveToGallery = true,
}: UseOfflineMediaOptions): UseOfflineMediaReturn => {
  const [status, setStatus] = useState<FileDownloadStatus>('remote');
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [savedToGallery, setSavedToGallery] = useState(false);
  
  const { isOnline } = useNetworkStatus();
  const objectUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const effectiveMimeType = mimeType || (remoteUrl ? guessMimeType(remoteUrl) : 'application/octet-stream');
  const effectiveFileName = fileName || (remoteUrl ? getFileNameFromUrl(remoteUrl) : 'file');

  /**
   * Vérifie si le fichier est disponible localement
   * Si oui, retourne l'URL locale pour affichage
   */
  const checkLocalPresence = useCallback(async () => {
    if (!remoteUrl) {
      setDisplayUrl(null);
      setStatus('remote');
      return;
    }

    try {
      const localFile = await fileStore.getFile(remoteUrl);
      
      if (localFile && localFile.blob) {
        // Fichier présent localement → créer URL blob
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        objectUrlRef.current = URL.createObjectURL(localFile.blob);
        
        setDisplayUrl(objectUrlRef.current);
        setStatus('downloaded');
        setError(null);
        console.log('📁 Loading from local storage:', effectiveFileName);
      } else {
        // Fichier non disponible localement
        setDisplayUrl(null);
        
        if (!isOnline) {
          setStatus('offline_unavailable');
        } else {
          setStatus('remote');
        }
      }
    } catch (err) {
      console.error('❌ Error checking local file:', err);
      setStatus('remote');
    }
  }, [remoteUrl, isOnline, effectiveFileName]);

  /**
   * Télécharge le fichier depuis Supabase vers le stockage local
   */
  const download = useCallback(async () => {
    if (!remoteUrl || !isOnline) {
      if (!isOnline) {
        setStatus('offline_unavailable');
      }
      return;
    }

    // Annuler téléchargement précédent
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setStatus('downloading');
    setProgress(0);
    setError(null);

    try {
      console.log('📥 Downloading from Supabase:', effectiveFileName);

      const response = await fetch(remoteUrl, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      if (total > 0 && response.body) {
        const reader = response.body.getReader();
        const chunks: ArrayBuffer[] = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
          received += value.length;
          setProgress(Math.round((received / total) * 100));
        }

        const blob = new Blob(chunks, { type: effectiveMimeType });
        
        // 1. Sauvegarder dans IndexedDB (accès offline)
        await fileStore.saveFile(remoteUrl, blob, {
          remoteUrl,
          fileName: effectiveFileName,
          fileType: effectiveMimeType,
          fileSize: blob.size,
          isOwnFile: false,
        });

        // 2. Sauvegarder dans la galerie Android/iOS si demandé
        if (saveToGallery && isNativePlatform()) {
          const mediaType = getMediaType(effectiveMimeType);
          if (mediaType === 'image' || mediaType === 'video') {
            try {
              const galleryResult = await saveMediaToDevice(blob, effectiveFileName, effectiveMimeType);
              setSavedToGallery(galleryResult.savedToGallery);
              if (galleryResult.savedToGallery) {
                console.log('📱 Saved to gallery:', galleryResult.filePath);
              }
            } catch (galleryError) {
              console.warn('⚠️ Could not save to gallery:', galleryError);
            }
          }
        }

        // Créer URL locale pour affichage
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        objectUrlRef.current = URL.createObjectURL(blob);

        setDisplayUrl(objectUrlRef.current);
        setStatus('downloaded');
        setProgress(100);
        
        console.log('✅ Downloaded & saved locally:', effectiveFileName);
      } else {
        // Fallback sans progression
        const blob = await response.blob();
        
        // 1. Sauvegarder dans IndexedDB
        await fileStore.saveFile(remoteUrl, blob, {
          remoteUrl,
          fileName: effectiveFileName,
          fileType: effectiveMimeType,
          fileSize: blob.size,
          isOwnFile: false,
        });

        // 2. Sauvegarder dans la galerie Android/iOS si demandé
        if (saveToGallery && isNativePlatform()) {
          const mediaType = getMediaType(effectiveMimeType);
          if (mediaType === 'image' || mediaType === 'video') {
            try {
              const galleryResult = await saveMediaToDevice(blob, effectiveFileName, effectiveMimeType);
              setSavedToGallery(galleryResult.savedToGallery);
              if (galleryResult.savedToGallery) {
                console.log('📱 Saved to gallery:', galleryResult.filePath);
              }
            } catch (galleryError) {
              console.warn('⚠️ Could not save to gallery:', galleryError);
            }
          }
        }

        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        objectUrlRef.current = URL.createObjectURL(blob);

        setDisplayUrl(objectUrlRef.current);
        setStatus('downloaded');
        setProgress(100);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setStatus('remote');
      } else {
        console.error('❌ Download error:', err);
        setError(err);
        setStatus('error');
      }
    }
  }, [remoteUrl, effectiveFileName, effectiveMimeType, isOnline, saveToGallery]);

  /**
   * Supprime la copie locale
   */
  const deleteLocal = useCallback(async () => {
    if (!remoteUrl) return;

    try {
      await fileStore.deleteFile(remoteUrl);
      
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      
      setDisplayUrl(null);
      setStatus(isOnline ? 'remote' : 'offline_unavailable');
      setProgress(0);
      
      console.log('🗑️ Local copy deleted:', effectiveFileName);
    } catch (err) {
      console.error('❌ Error deleting local file:', err);
    }
  }, [remoteUrl, effectiveFileName, isOnline]);

  // Vérifier la présence locale au montage
  useEffect(() => {
    checkLocalPresence();
  }, [checkLocalPresence]);

  // Mettre à jour le statut selon la connexion
  useEffect(() => {
    if (status === 'remote' && !isOnline) {
      setStatus('offline_unavailable');
    } else if (status === 'offline_unavailable' && isOnline) {
      setStatus('remote');
    }
  }, [isOnline, status]);

  // Auto-télécharger si activé
  useEffect(() => {
    if (autoDownload && status === 'remote' && isOnline && remoteUrl) {
      download();
    }
  }, [autoDownload, status, isOnline, remoteUrl, download]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    displayUrl,
    status,
    progress,
    isLocal: status === 'downloaded',
    savedToGallery,
    error,
    download,
    deleteLocal,
  };
};


import { useState, useEffect, useCallback, useRef } from 'react';
import { fileStore } from '../stores/FileStore';
import { useNetworkStatus } from './useNetworkStatus';
import { FileDownloadStatus } from '../types';

interface UseOfflineMediaOptions {
  /** URL distante du média (Supabase ou autre) */
  remoteUrl: string | null | undefined;
  /** Type MIME du fichier */
  mimeType?: string;
  /** Nom du fichier pour le stockage */
  fileName?: string;
  /** Télécharger automatiquement si non disponible localement */
  autoDownload?: boolean;
}

interface UseOfflineMediaReturn {
  /** URL à utiliser pour l'affichage (toujours locale si disponible) */
  displayUrl: string | null;
  /** Statut du fichier */
  status: FileDownloadStatus;
  /** Progression du téléchargement (0-100) */
  progress: number;
  /** Le fichier est-il disponible localement ? */
  isLocal: boolean;
  /** Erreur éventuelle */
  error: Error | null;
  /** Déclencher manuellement le téléchargement */
  download: () => Promise<void>;
  /** Supprimer la copie locale */
  deleteLocal: () => Promise<void>;
}

/**
 * Détermine le type MIME à partir de l'URL
 */
const guessMimeType = (url: string): string => {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || '';
  const mimeMap: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeMap[ext] || 'application/octet-stream';
};

/**
 * Extrait le nom du fichier depuis l'URL
 */
const getFileNameFromUrl = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/');
    return parts[parts.length - 1] || 'file';
  } catch {
    return 'file';
  }
};

export const useOfflineMedia = ({
  remoteUrl,
  mimeType,
  fileName,
  autoDownload = false,
}: UseOfflineMediaOptions): UseOfflineMediaReturn => {
  const [status, setStatus] = useState<FileDownloadStatus>('remote');
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  
  const { isOnline } = useNetworkStatus();
  const objectUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const effectiveMimeType = mimeType || (remoteUrl ? guessMimeType(remoteUrl) : 'application/octet-stream');
  const effectiveFileName = fileName || (remoteUrl ? getFileNameFromUrl(remoteUrl) : 'file');

  /**
   * Vérifie si le fichier est disponible localement
   * Si oui, retourne l'URL locale pour affichage
   */
  const checkLocalPresence = useCallback(async () => {
    if (!remoteUrl) {
      setDisplayUrl(null);
      setStatus('remote');
      return;
    }

    try {
      const localFile = await fileStore.getFile(remoteUrl);
      
      if (localFile && localFile.blob) {
        // Fichier présent localement → créer URL blob
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        objectUrlRef.current = URL.createObjectURL(localFile.blob);
        
        setDisplayUrl(objectUrlRef.current);
        setStatus('downloaded');
        setError(null);
        console.log('📁 Loading from local storage:', effectiveFileName);
      } else {
        // Fichier non disponible localement
        setDisplayUrl(null);
        
        if (!isOnline) {
          setStatus('offline_unavailable');
        } else {
          setStatus('remote');
        }
      }
    } catch (err) {
      console.error('❌ Error checking local file:', err);
      setStatus('remote');
    }
  }, [remoteUrl, isOnline, effectiveFileName]);

  /**
   * Télécharge le fichier depuis Supabase vers le stockage local
   */
  const download = useCallback(async () => {
    if (!remoteUrl || !isOnline) {
      if (!isOnline) {
        setStatus('offline_unavailable');
      }
      return;
    }

    // Annuler téléchargement précédent
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setStatus('downloading');
    setProgress(0);
    setError(null);

    try {
      console.log('📥 Downloading from Supabase:', effectiveFileName);

      const response = await fetch(remoteUrl, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      if (total > 0 && response.body) {
        const reader = response.body.getReader();
        const chunks: ArrayBuffer[] = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
          received += value.length;
          setProgress(Math.round((received / total) * 100));
        }

        const blob = new Blob(chunks, { type: effectiveMimeType });
        
        // Sauvegarder localement
        await fileStore.saveFile(remoteUrl, blob, {
          remoteUrl,
          fileName: effectiveFileName,
          fileType: effectiveMimeType,
          fileSize: blob.size,
          isOwnFile: false,
        });

        // Créer URL locale
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        objectUrlRef.current = URL.createObjectURL(blob);

        setDisplayUrl(objectUrlRef.current);
        setStatus('downloaded');
        setProgress(100);
        
        console.log('✅ Downloaded & saved locally:', effectiveFileName);
      } else {
        // Fallback sans progression
        const blob = await response.blob();
        
        await fileStore.saveFile(remoteUrl, blob, {
          remoteUrl,
          fileName: effectiveFileName,
          fileType: effectiveMimeType,
          fileSize: blob.size,
          isOwnFile: false,
        });

        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        objectUrlRef.current = URL.createObjectURL(blob);

        setDisplayUrl(objectUrlRef.current);
        setStatus('downloaded');
        setProgress(100);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setStatus('remote');
      } else {
        console.error('❌ Download error:', err);
        setError(err);
        setStatus('error');
      }
    }
  }, [remoteUrl, effectiveFileName, effectiveMimeType, isOnline]);

  /**
   * Supprime la copie locale
   */
  const deleteLocal = useCallback(async () => {
    if (!remoteUrl) return;

    try {
      await fileStore.deleteFile(remoteUrl);
      
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      
      setDisplayUrl(null);
      setStatus(isOnline ? 'remote' : 'offline_unavailable');
      setProgress(0);
      
      console.log('🗑️ Local copy deleted:', effectiveFileName);
    } catch (err) {
      console.error('❌ Error deleting local file:', err);
    }
  }, [remoteUrl, effectiveFileName, isOnline]);

  // Vérifier la présence locale au montage
  useEffect(() => {
    checkLocalPresence();
  }, [checkLocalPresence]);

  // Mettre à jour le statut selon la connexion
  useEffect(() => {
    if (status === 'remote' && !isOnline) {
      setStatus('offline_unavailable');
    } else if (status === 'offline_unavailable' && isOnline) {
      setStatus('remote');
    }
  }, [isOnline, status]);

  // Auto-télécharger si activé
  useEffect(() => {
    if (autoDownload && status === 'remote' && isOnline && remoteUrl) {
      download();
    }
  }, [autoDownload, status, isOnline, remoteUrl, download]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    displayUrl,
    status,
    progress,
    isLocal: status === 'downloaded',
    error,
    download,
    deleteLocal,
  };
};
