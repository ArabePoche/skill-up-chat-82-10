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
 * 
 * UX PRO (WhatsApp-like):
 * ✅ On n'affiche JAMAIS le bouton Télécharger tant que la vérification locale n'est pas terminée
 * ✅ Priorité absolue à l'affichage immédiat si déjà en cache mémoire
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
  /** ID stable du fichier (recommandé si URL signée/expirable) */
  fileId?: string;
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
  /** Vérification locale (IndexedDB) terminée ? */
  hasCheckedLocal: boolean;
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
  fileId,
  mimeType,
  fileName,
  autoDownload = false,
  saveToGallery = true,
}: UseOfflineMediaOptions): UseOfflineMediaReturn => {
  const { isOnline } = useNetworkStatus();

  // Calculer les valeurs dérivées une seule fois
  const effectiveMimeType = useMemo(
    () => mimeType || (remoteUrl ? guessMimeType(remoteUrl) : 'application/octet-stream'),
    [mimeType, remoteUrl]
  );

  const effectiveFileName = useMemo(
    () => fileName || (remoteUrl ? getFileNameFromUrl(remoteUrl) : 'file'),
    [fileName, remoteUrl]
  );

  // ✅ Clé stable principale : fileId si fourni, sinon fallback (moins fiable) sur hash d'URL
  const resolvedFileId = useMemo(() => {
    if (fileId) return fileId;
    if (remoteUrl) return fileStore.generateFileId(remoteUrl);
    return null;
  }, [fileId, remoteUrl]);

  // ⚡ OPTIMISATION CRITIQUE: lecture SYNCHRONE du cache mémoire
  const cachedStatus = useMemo(() => {
    if (!resolvedFileId) return null;
    return fileStatusCache.get(resolvedFileId);
  }, [resolvedFileId]);

  const hasCachedBlob = !!(cachedStatus?.status === 'downloaded' && cachedStatus?.blobUrl);

  const [status, setStatus] = useState<FileDownloadStatus>(hasCachedBlob ? 'downloaded' : 'remote');
  const [displayUrl, setDisplayUrl] = useState<string | null>(cachedStatus?.blobUrl || null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [savedToGallery, setSavedToGallery] = useState(false);

  // ✅ Permet aux composants de NE PAS afficher "Télécharger" tant que ce n'est pas certain
  const [hasCheckedLocal, setHasCheckedLocal] = useState<boolean>(hasCachedBlob);

  const objectUrlRef = useRef<string | null>(cachedStatus?.blobUrl || null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Empêche les re-checks pour un même fichier
  const checkedKeyRef = useRef<string | null>(hasCachedBlob ? resolvedFileId : null);

  // Reset propre si on change de média (fileId)
  useEffect(() => {
    if (!resolvedFileId) {
      setDisplayUrl(null);
      setStatus('remote');
      setHasCheckedLocal(true);
      checkedKeyRef.current = null;
      return;
    }

    if (hasCachedBlob && cachedStatus?.blobUrl) {
      setDisplayUrl(cachedStatus.blobUrl);
      setStatus('downloaded');
      objectUrlRef.current = cachedStatus.blobUrl;
      setHasCheckedLocal(true);
      checkedKeyRef.current = resolvedFileId;
      return;
    }

    // Pas de cache blob → on doit vérifier IndexedDB (mais SANS afficher le bouton Télécharger)
    setDisplayUrl(null);
    setStatus('remote');
    setHasCheckedLocal(false);
    checkedKeyRef.current = null;
    setError(null);
    setProgress(0);
    setSavedToGallery(false);
  }, [resolvedFileId, hasCachedBlob, cachedStatus?.blobUrl]);

  /**
   * Vérifie si le fichier est disponible localement
   * ➜ 1 seule fois par média (fileId) tant qu'on n'a pas changé de fileId
   */
  const checkLocalPresence = useCallback(async () => {
    if (!remoteUrl || !resolvedFileId) {
      setDisplayUrl(null);
      setStatus('remote');
      setHasCheckedLocal(true);
      return;
    }

    // Éviter les vérifications multiples pour le même fichier
    if (checkedKeyRef.current === resolvedFileId) return;
    checkedKeyRef.current = resolvedFileId;

    // UX: tant que la vérification n'est pas terminée, on masque le bouton Télécharger
    setHasCheckedLocal(false);

    // ⚡ Re-check instantané du cache mémoire (au cas où un autre composant a téléchargé)
    const cached = fileStatusCache.get(resolvedFileId);
    if (cached?.status === 'downloaded' && cached.blobUrl) {
      setDisplayUrl(cached.blobUrl);
      setStatus('downloaded');
      objectUrlRef.current = cached.blobUrl;
      setError(null);
      setHasCheckedLocal(true);
      return;
    }

    try {
      const localFile = await fileStore.getFileById(resolvedFileId);

      if (localFile?.blob) {
        const blobUrl = URL.createObjectURL(localFile.blob);
        objectUrlRef.current = blobUrl;

        fileStatusCache.set(resolvedFileId, {
          fileId: resolvedFileId,
          status: 'downloaded',
          blobUrl,
          checkedAt: Date.now(),
          remoteUrl,
        });

        setDisplayUrl(blobUrl);
        setStatus('downloaded');
        setError(null);
        console.log('📁 [Cache] Loaded from local storage:', effectiveFileName);
      } else {
        const newStatus: FileDownloadStatus = isOnline ? 'remote' : 'offline_unavailable';

        fileStatusCache.set(resolvedFileId, {
          fileId: resolvedFileId,
          status: newStatus,
          blobUrl: null,
          checkedAt: Date.now(),
          remoteUrl,
        });

        setDisplayUrl(null);
        setStatus(newStatus);
      }
    } catch (err) {
      console.error('❌ Error checking local file:', err);
      setStatus('remote');
    } finally {
      setHasCheckedLocal(true);
    }
  }, [remoteUrl, resolvedFileId, isOnline, effectiveFileName]);

  /**
   * Télécharge le fichier depuis Supabase vers le stockage local
   */
  const download = useCallback(async () => {
    if (!remoteUrl || !isOnline || !resolvedFileId) {
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
      await fileStore.saveFile(resolvedFileId, blob, {
        remoteUrl,
        fileName: effectiveFileName,
        fileType: effectiveMimeType,
        fileSize: blob.size,
        isOwnFile: false,
      });

      // 2. Sauvegarder dans le stockage du téléphone (galerie ou Documents)
      // ✅ Comportement type WhatsApp: tous les fichiers téléchargés sont sauvegardés
      if (saveToGallery && isNativePlatform()) {
        try {
          const galleryResult = await saveMediaToDevice(blob, effectiveFileName, effectiveMimeType);
          setSavedToGallery(galleryResult.savedToGallery || galleryResult.success);
          
          const mediaType = getMediaType(effectiveMimeType);
          if (galleryResult.savedToGallery) {
            console.log('📱 Image/Vidéo sauvegardée dans la galerie:', galleryResult.filePath);
          } else if (galleryResult.success && galleryResult.filePath) {
            console.log(`📂 ${mediaType === 'audio' ? 'Audio' : 'Document'} sauvegardé dans EducaTok:`, galleryResult.filePath);
          }
        } catch (galleryError) {
          console.warn('⚠️ Impossible de sauvegarder sur le téléphone:', galleryError);
        }
      }

      // Créer URL locale pour affichage
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      const blobUrl = URL.createObjectURL(blob);
      objectUrlRef.current = blobUrl;

      // Mettre à jour le cache mémoire
      fileStatusCache.set(resolvedFileId, {
        fileId: resolvedFileId,
        status: 'downloaded',
        blobUrl,
        checkedAt: Date.now(),
        remoteUrl,
      });

      setDisplayUrl(blobUrl);
      setStatus('downloaded');
      setProgress(100);
      setHasCheckedLocal(true);

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
  }, [remoteUrl, resolvedFileId, effectiveFileName, effectiveMimeType, isOnline, saveToGallery]);

  /**
   * Supprime la copie locale
   */
  const deleteLocal = useCallback(async () => {
    if (!remoteUrl || !resolvedFileId) return;

    try {
      await fileStore.deleteFileById(resolvedFileId);

      // Invalider le cache mémoire
      fileStatusCache.delete(resolvedFileId);

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      setDisplayUrl(null);
      setStatus(isOnline ? 'remote' : 'offline_unavailable');
      setProgress(0);

      // Après suppression, on est "sûr" que le fichier n'est plus local
      setHasCheckedLocal(true);
      checkedKeyRef.current = resolvedFileId;

      console.log('🗑️ Local copy deleted:', effectiveFileName);
    } catch (err) {
      console.error('❌ Error deleting local file:', err);
    }
  }, [remoteUrl, resolvedFileId, effectiveFileName, isOnline]);

  // Vérifier IndexedDB si nécessaire (pas de bouton Télécharger tant que ce n'est pas fait)
  useEffect(() => {
    if (!remoteUrl || !resolvedFileId) return;
    if (displayUrl) return;
    if (!hasCheckedLocal) {
      checkLocalPresence();
    }
  }, [remoteUrl, resolvedFileId, displayUrl, hasCheckedLocal, checkLocalPresence]);

  // Mettre à jour le statut selon la connexion (uniquement quand la vérification est terminée)
  useEffect(() => {
    if (!hasCheckedLocal) return;

    if (status === 'remote' && !isOnline) {
      setStatus('offline_unavailable');
    } else if (status === 'offline_unavailable' && isOnline) {
      setStatus('remote');
    }
  }, [isOnline, status, hasCheckedLocal]);

  // Auto-télécharger si activé (uniquement après vérification IndexedDB)
  useEffect(() => {
    if (!hasCheckedLocal) return;

    if (autoDownload && status === 'remote' && isOnline && remoteUrl) {
      download();
    }
  }, [autoDownload, status, isOnline, remoteUrl, download, hasCheckedLocal]);

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
    hasCheckedLocal,
    savedToGallery,
    error,
    download,
    deleteLocal,
  };
};
