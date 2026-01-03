/**
 * Hook principal pour la gestion du téléchargement de fichiers
 * Logique offline-first : téléchargement → stockage local → affichage depuis local uniquement
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fileStore } from '../stores/FileStore';
import { useNetworkStatus } from './useNetworkStatus';
import { useAuth } from '@/hooks/useAuth';
import { FileDownloadStatus, LocalFileMetadata } from '../types';

interface UseFileDownloadOptions {
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  ownerId?: string;
  autoDownloadOwn?: boolean; // Télécharger auto si c'est notre fichier
}

interface UseFileDownloadReturn {
  status: FileDownloadStatus;
  localUrl: string | null;
  metadata: LocalFileMetadata | null;
  progress: number;
  error: Error | null;
  download: () => Promise<void>;
  deleteLocal: () => Promise<void>;
  isOwnFile: boolean;
}

export const useFileDownload = ({
  fileUrl,
  fileName,
  fileType,
  fileSize = 0,
  ownerId,
  autoDownloadOwn = true,
}: UseFileDownloadOptions): UseFileDownloadReturn => {
  const [status, setStatus] = useState<FileDownloadStatus>('remote');
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<LocalFileMetadata | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  
  const { isOnline } = useNetworkStatus();
  const { user } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const isOwnFile = Boolean(user?.id && ownerId && user.id === ownerId);

  /**
   * Vérifie la présence locale du fichier à chaque rendu
   * C'est le cœur de la logique offline-first
   */
  const checkLocalPresence = useCallback(async () => {
    if (!fileUrl) return;

    try {
      const localFile = await fileStore.getFile(fileUrl);
      
      if (localFile) {
        // Fichier présent localement → créer URL blob pour affichage
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        objectUrlRef.current = URL.createObjectURL(localFile.blob as Blob);
        
        setLocalUrl(objectUrlRef.current);
        setMetadata(localFile.metadata);
        setStatus('downloaded');
        setError(null);
      } else {
        // Fichier non présent localement
        setLocalUrl(null);
        setMetadata(null);
        
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
  }, [fileUrl, isOnline]);

  /**
   * Télécharge le fichier depuis Supabase et le stocke localement
   * IMPORTANT: Supabase = source de téléchargement UNIQUEMENT
   */
  const download = useCallback(async () => {
    if (!fileUrl || !isOnline) {
      if (!isOnline) {
        setStatus('offline_unavailable');
      }
      return;
    }

    // Annuler un téléchargement précédent
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setStatus('downloading');
    setProgress(0);
    setError(null);

    try {
      console.log('📥 Downloading from remote:', fileName);

      const response = await fetch(fileUrl, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Gestion de la progression
      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : fileSize || 0;
      
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

        const blob = new Blob(chunks, { type: fileType });
        
        // Sauvegarder localement
        const savedMetadata = await fileStore.saveFile(fileUrl, blob, {
          remoteUrl: fileUrl,
          fileName,
          fileType,
          fileSize: blob.size,
          ownerId,
          isOwnFile,
        });

        // Créer l'URL locale pour affichage
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        objectUrlRef.current = URL.createObjectURL(blob);

        setLocalUrl(objectUrlRef.current);
        setMetadata(savedMetadata);
        setStatus('downloaded');
        setProgress(100);
        
        console.log('✅ File downloaded & saved locally:', fileName);
      } else {
        // Fallback sans progression
        const blob = await response.blob();
        
        const savedMetadata = await fileStore.saveFile(fileUrl, blob, {
          remoteUrl: fileUrl,
          fileName,
          fileType,
          fileSize: blob.size,
          ownerId,
          isOwnFile,
        });

        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        objectUrlRef.current = URL.createObjectURL(blob);

        setLocalUrl(objectUrlRef.current);
        setMetadata(savedMetadata);
        setStatus('downloaded');
        setProgress(100);
        
        console.log('✅ File downloaded (no progress):', fileName);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('⏹️ Download aborted:', fileName);
        setStatus('remote');
      } else {
        console.error('❌ Download error:', err);
        setError(err);
        setStatus('error');
      }
    }
  }, [fileUrl, fileName, fileType, fileSize, ownerId, isOwnFile, isOnline]);

  /**
   * Supprime le fichier local
   */
  const deleteLocal = useCallback(async () => {
    if (!fileUrl) return;

    try {
      await fileStore.deleteFile(fileUrl);
      
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      
      setLocalUrl(null);
      setMetadata(null);
      setStatus(isOnline ? 'remote' : 'offline_unavailable');
      setProgress(0);
      
      console.log('🗑️ Local file deleted:', fileName);
    } catch (err) {
      console.error('❌ Error deleting local file:', err);
    }
  }, [fileUrl, fileName, isOnline]);

  // Vérifier la présence locale au montage et quand l'URL change
  useEffect(() => {
    checkLocalPresence();
  }, [checkLocalPresence]);

  // Mettre à jour le statut quand la connexion change
  useEffect(() => {
    if (status === 'remote' && !isOnline) {
      setStatus('offline_unavailable');
    } else if (status === 'offline_unavailable' && isOnline) {
      setStatus('remote');
    }
  }, [isOnline, status]);

  // Auto-télécharger si c'est notre propre fichier
  useEffect(() => {
    if (autoDownloadOwn && isOwnFile && status === 'remote' && isOnline) {
      download();
    }
  }, [autoDownloadOwn, isOwnFile, status, isOnline, download]);

  // Cleanup des Object URLs au démontage
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
    status,
    localUrl,
    metadata,
    progress,
    error,
    download,
    deleteLocal,
    isOwnFile,
  };
};
