/**
 * Utilitaire de téléchargement de fichier cross-platform
 * - Sur native (Capacitor): sauvegarde dans la galerie (images/vidéos) ou dans REZO (audio/docs)
 * - Sur web: téléchargement classique via lien <a>
 */

import { saveMediaToDevice, isNativePlatform } from './mediaGallery';
import { fileStatusCache } from '../stores/FileStatusCache';
import { fileStore } from '../stores/FileStore';
import { toast } from 'sonner';

/**
 * Télécharge un fichier et le sauvegarde dans la galerie (natif) ou le dossier Téléchargements (web)
 */
export const downloadFile = async (
  fileUrl: string,
  fileName: string,
  fileType?: string
): Promise<void> => {
  if (isNativePlatform()) {
    try {
      toast.info('Téléchargement en cours...');
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const mimeType = fileType || blob.type || 'application/octet-stream';

      try {
        await fileStore.saveFile(fileUrl, blob, {
          remoteUrl: fileUrl,
          fileName,
          fileType: mimeType,
          fileSize: blob.size,
          isOwnFile: false,
        });

        const localUrl = URL.createObjectURL(blob);
        fileStatusCache.setByUrl(fileUrl, {
          status: 'downloaded',
          blobUrl: localUrl,
          checkedAt: Date.now(),
        });
      } catch (storageError) {
        console.warn('⚠️ Persistence locale impossible, téléchargement appareil conservé:', storageError);
      }

      const result = await saveMediaToDevice(blob, fileName, mimeType);
      if (result.success) {
        toast.success(
          result.savedToGallery
            ? 'Fichier sauvegardé dans la galerie !'
            : 'Fichier sauvegardé dans REZO !'
        );
      } else {
        toast.error(`Erreur: ${result.error || 'Sauvegarde échouée'}`);
      }
    } catch (error) {
      console.error('❌ Erreur téléchargement natif:', error);
      toast.error('Erreur lors du téléchargement');
    }
    return;
  }

  // Web: téléchargement via fetch pour forcer le téléchargement (éviter ouverture nouvel onglet)
  try {
    toast.info('Téléchargement en cours...');
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
  } catch (error) {
    console.error('❌ Erreur téléchargement web via fetch, utilisation du fallback:', error);
    // Fallback classique si fetch bloque (CORS)
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
