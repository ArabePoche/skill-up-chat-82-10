/**
 * Hook pour télécharger et sauvegarder des médias dans la galerie
 * Comportement type WhatsApp: téléchargement → stockage local + galerie
 * 
 * FONCTIONNEMENT:
 * 1. Télécharge le fichier depuis l'URL distante
 * 2. Sauvegarde dans IndexedDB (accès offline)
 * 3. Sauvegarde dans la galerie Android/iOS (visible dans Photos)
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { fileStore } from '../stores/FileStore';
import { useNetworkStatus } from './useNetworkStatus';
import { useAuth } from '@/hooks/useAuth';
import { 
  saveMediaToDevice, 
  getMediaType, 
  isNativePlatform,
  SaveToGalleryResult,
  MediaType 
} from '../utils/mediaGallery';

interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UseMediaDownloadOptions {
  /** Callback appelé après sauvegarde réussie */
  onSuccess?: (result: MediaDownloadResult) => void;
  /** Callback appelé en cas d'erreur */
  onError?: (error: Error) => void;
  /** Afficher les toasts de notification */
  showToasts?: boolean;
}

export interface MediaDownloadResult {
  /** Le fichier a été téléchargé */
  downloaded: boolean;
  /** Le fichier a été sauvegardé dans la galerie (images/vidéos) */
  savedToGallery: boolean;
  /** Chemin du fichier dans la galerie (si applicable) */
  galleryPath?: string;
  /** URL blob locale pour affichage */
  localUrl: string;
  /** Type de média */
  mediaType: MediaType;
}

export interface UseMediaDownloadReturn {
  /** Télécharge et sauvegarde un média */
  downloadMedia: (
    fileUrl: string,
    fileName: string,
    mimeType: string,
    ownerId?: string
  ) => Promise<MediaDownloadResult | null>;
  
  /** État de téléchargement en cours */
  isDownloading: boolean;
  
  /** Progression du téléchargement */
  progress: DownloadProgress | null;
  
  /** Erreur éventuelle */
  error: Error | null;
  
  /** Annule le téléchargement en cours */
  cancel: () => void;
}

export const useMediaDownload = (
  options: UseMediaDownloadOptions = {}
): UseMediaDownloadReturn => {
  const { onSuccess, onError, showToasts = true } = options;
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  const { isOnline } = useNetworkStatus();
  const { user } = useAuth();

  const cancel = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsDownloading(false);
    setProgress(null);
  }, [abortController]);

  const downloadMedia = useCallback(async (
    fileUrl: string,
    fileName: string,
    mimeType: string,
    ownerId?: string
  ): Promise<MediaDownloadResult | null> => {
    if (!isOnline) {
      const offlineError = new Error('Pas de connexion internet');
      setError(offlineError);
      if (showToasts) toast.error('Téléchargement impossible hors ligne');
      onError?.(offlineError);
      return null;
    }

    // Annuler tout téléchargement précédent
    cancel();

    const controller = new AbortController();
    setAbortController(controller);
    setIsDownloading(true);
    setProgress({ loaded: 0, total: 0, percentage: 0 });
    setError(null);

    const mediaType = getMediaType(mimeType);
    console.log(`📥 Début téléchargement ${mediaType}:`, fileName);

    try {
      // 1. Télécharger le fichier
      const response = await fetch(fileUrl, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      // Gestion de la progression
      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      let blob: Blob;

      if (total > 0 && response.body) {
        const reader = response.body.getReader();
        const chunks: ArrayBuffer[] = [];
        let loaded = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Convertir Uint8Array en ArrayBuffer pour éviter les erreurs de type
          chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
          loaded += value.length;
          
          setProgress({
            loaded,
            total,
            percentage: Math.round((loaded / total) * 100),
          });
        }

        blob = new Blob(chunks, { type: mimeType });
      } else {
        blob = await response.blob();
        setProgress({ loaded: blob.size, total: blob.size, percentage: 100 });
      }

      console.log('✅ Téléchargement terminé:', fileName, 'Taille:', blob.size);

      // 2. Sauvegarder dans IndexedDB (pour accès offline)
      const isOwnFile = Boolean(user?.id && ownerId && user.id === ownerId);
      
      await fileStore.saveFile(fileUrl, blob, {
        remoteUrl: fileUrl,
        fileName,
        fileType: mimeType,
        fileSize: blob.size,
        ownerId,
        isOwnFile,
      });
      console.log('💾 Sauvegardé dans IndexedDB');

      // 3. Sauvegarder dans la galerie (Android/iOS)
      let galleryResult: SaveToGalleryResult = { success: true, savedToGallery: false };
      
      if (isNativePlatform()) {
        galleryResult = await saveMediaToDevice(blob, fileName, mimeType);
        
        if (galleryResult.savedToGallery && showToasts) {
          const typeLabel = mediaType === 'image' ? 'Image' : 
                           mediaType === 'video' ? 'Vidéo' : 
                           mediaType === 'audio' ? 'Audio' : 'Fichier';
          toast.success(`${typeLabel} sauvegardé dans la galerie`);
        }
      }

      // Créer URL blob pour affichage
      const localUrl = URL.createObjectURL(blob);

      const result: MediaDownloadResult = {
        downloaded: true,
        savedToGallery: galleryResult.savedToGallery,
        galleryPath: galleryResult.filePath,
        localUrl,
        mediaType,
      };

      onSuccess?.(result);
      setIsDownloading(false);
      setProgress(null);
      
      return result;

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('⏹️ Téléchargement annulé:', fileName);
        setIsDownloading(false);
        setProgress(null);
        return null;
      }

      console.error('❌ Erreur téléchargement:', err);
      setError(err);
      setIsDownloading(false);
      setProgress(null);
      
      if (showToasts) {
        toast.error(`Erreur: ${err.message}`);
      }
      
      onError?.(err);
      return null;
    }
  }, [isOnline, user, cancel, onSuccess, onError, showToasts]);

  return {
    downloadMedia,
    isDownloading,
    progress,
    error,
    cancel,
  };
};
