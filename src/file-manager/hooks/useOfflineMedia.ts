/**
 * Hook simplifié pour charger un média en mode offline-first
 * 
 * ARCHITECTURE OPTIMISÉE:
 * ✅ Cache mémoire pour éviter les vérifications répétées
 * ✅ Vérification IndexedDB une seule fois au montage
 * ✅ Pas de vérification au scroll/render
 * ✅ Supabase = source de téléchargement initial UNIQUEMENT
 * ✅ IndexedDB = source réelle d'affichage
 * ✅ Galerie Android/iOS = visibilité dans Photos (images/vidéos)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { fileStore } from '../stores/FileStore';
import { useNetworkStatus } from './useNetworkStatus';
import { FileDownloadStatus } from '../types';
import { saveMediaToDevice, isNativePlatform, getMediaType } from '../utils/mediaGallery';
import { fileStatusCache } from '../stores/FileStatusCache';

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

export interface UseOfflineMediaReturn {
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
  // Calculer les valeurs dérivées une seule fois
  const effectiveMimeType = useMemo(
    () => mimeType || (remoteUrl ? guessMimeType(remoteUrl) : 'application/octet-stream'),
    [mimeType, remoteUrl]
  );
  const effectiveFileName = useMemo(
    () => fileName || (remoteUrl ? getFileNameFromUrl(remoteUrl) : 'file'),
    [fileName, remoteUrl]
  );

  // ⚡ OPTIMISATION CRITIQUE: Récupérer IMMÉDIATEMENT depuis le cache mémoire
  // Cette vérification est synchrone et instantanée (pas d'async)
  const cachedStatus = useMemo(() => {
    if (!remoteUrl) return null;
    return fileStatusCache.getByUrl(remoteUrl);
  }, [remoteUrl]);
  
  // ⚡ Si en cache avec blobUrl → état initial = downloaded (priorité absolue)
  // Si pas en cache → état "checking" pour éviter d'afficher le bouton télécharger
  const hasCachedBlob = !!(cachedStatus?.status === 'downloaded' && cachedStatus?.blobUrl);
  const initialStatus: FileDownloadStatus = hasCachedBlob 
    ? 'downloaded' 
    : 'checking'; // Nouvel état: vérification en cours
  const initialDisplayUrl = cachedStatus?.blobUrl || null;
  
  const [status, setStatus] = useState<FileDownloadStatus>(initialStatus);
  const [displayUrl, setDisplayUrl] = useState<string | null>(initialDisplayUrl);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [savedToGallery, setSavedToGallery] = useState(false);
  
  const { isOnline } = useNetworkStatus();
  const objectUrlRef = useRef<string | null>(initialDisplayUrl);
  const abortControllerRef = useRef<AbortController | null>(null);
  // ⚡ Si déjà en cache mémoire avec blob, pas besoin de vérifier IndexedDB
  const hasCheckedRef = useRef<boolean>(hasCachedBlob);

  /**
   * Vérifie si le fichier est disponible localement
   * APPELÉE UNE SEULE FOIS au montage si pas en cache
   */
  const checkLocalPresence = useCallback(async () => {
    if (!remoteUrl) {
      setDisplayUrl(null);
      setStatus('remote');
      return;
    }

    // Éviter les vérifications multiples
    if (hasCheckedRef.current) return;
    
    // Si déjà en cache mémoire, ne pas revérifier IndexedDB
    const cached = fileStatusCache.getByUrl(remoteUrl);
    if (cached && cached.status === 'downloaded' && cached.blobUrl) {
      setDisplayUrl(cached.blobUrl);
      setStatus('downloaded');
      objectUrlRef.current = cached.blobUrl;
      hasCheckedRef.current = true;
      return;
    }

    hasCheckedRef.current = true;

    try {
      const localFile = await fileStore.getFile(remoteUrl);
      
      if (localFile && localFile.blob) {
        // Fichier présent localement → créer URL blob
        const blobUrl = URL.createObjectURL(localFile.blob);
        objectUrlRef.current = blobUrl;
        
        // Mettre en cache mémoire (utiliser setByUrl pour compatibilité)
        fileStatusCache.setByUrl(remoteUrl, {
          status: 'downloaded',
          blobUrl,
          checkedAt: Date.now(),
        });
        
        setDisplayUrl(blobUrl);
        setStatus('downloaded');
        setError(null);
        console.log('📁 [Cache] Loaded from local storage:', effectiveFileName);
      } else {
        // Fichier non disponible localement
        const newStatus = isOnline ? 'remote' : 'offline_unavailable';
        
        fileStatusCache.setByUrl(remoteUrl, {
          status: newStatus,
          blobUrl: null,
          checkedAt: Date.now(),
        });
        
        setDisplayUrl(null);
        setStatus(newStatus);
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

      let blob: Blob;

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

        blob = new Blob(chunks, { type: effectiveMimeType });
      } else {
        // Fallback sans progression
        blob = await response.blob();
      }

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
      const blobUrl = URL.createObjectURL(blob);
      objectUrlRef.current = blobUrl;

      // Mettre à jour le cache mémoire
      fileStatusCache.setByUrl(remoteUrl, {
        status: 'downloaded',
        blobUrl,
        checkedAt: Date.now(),
      });

      setDisplayUrl(blobUrl);
      setStatus('downloaded');
      setProgress(100);
      
      console.log('✅ Downloaded & saved locally:', effectiveFileName);
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
      
      // Invalider le cache mémoire
      fileStatusCache.deleteByUrl(remoteUrl);
      
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      
      setDisplayUrl(null);
      setStatus(isOnline ? 'remote' : 'offline_unavailable');
      setProgress(0);
      hasCheckedRef.current = false;
      
      console.log('🗑️ Local copy deleted:', effectiveFileName);
    } catch (err) {
      console.error('❌ Error deleting local file:', err);
    }
  }, [remoteUrl, effectiveFileName, isOnline]);

  // ⚡ Vérifier IndexedDB SEULEMENT si pas déjà en cache mémoire
  useEffect(() => {
    // Si déjà marqué comme downloaded avec une URL, pas besoin de vérifier
    if (status === 'downloaded' && displayUrl) {
      return;
    }
    checkLocalPresence();
  }, [checkLocalPresence, status, displayUrl]);

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

  // Cleanup uniquement au démontage complet
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Note: On ne révoque PAS l'URL blob car elle est en cache mémoire
      // Elle sera révoquée lors de la suppression du cache ou du fichier
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
