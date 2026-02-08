/**
 * Utilitaire de téléchargement de fichier cross-platform
 * - Sur native (Capacitor): sauvegarde dans la galerie (images/vidéos) ou dans EducaTok (audio/docs)
 * - Sur web: téléchargement classique via lien <a>
 */

import { saveMediaToDevice, isNativePlatform } from './mediaGallery';
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
      const result = await saveMediaToDevice(blob, fileName, mimeType);
      if (result.success) {
        toast.success(
          result.savedToGallery
            ? 'Fichier sauvegardé dans la galerie !'
            : 'Fichier sauvegardé dans EducaTok !'
        );
      } else {
        toast.error(`Erreur: ${result.error || 'Sauvegarde échouée'}`);
      }
    } catch (error: any) {
      console.error('❌ Erreur téléchargement natif:', error);
      toast.error('Erreur lors du téléchargement');
    }
    return;
  }

  // Web: téléchargement classique
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = fileName;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
