/**
 * Sauvegarde d'un blob vidéo : galerie native (Capacitor) ou téléchargement web.
 */

export async function saveVideoBlob(
  blob: Blob,
  fileName: string,
  mimeType: string,
  onProgress?: (percent: number) => void,
  onStageChange?: (stage: string) => void
): Promise<void> {
  onStageChange?.('Enregistrement de la vidéo');
  onProgress?.(95);

  const { isNativePlatform, saveMediaToDevice } = await import('@/file-manager/utils/mediaGallery');

  if (isNativePlatform()) {
    onStageChange?.('Sauvegarde dans la galerie...');
    const result = await saveMediaToDevice(blob, fileName, mimeType);
    if (!result.success) {
      throw new Error(result.error || 'Sauvegarde dans la galerie échouée');
    }
    onProgress?.(100);
    return;
  }

  // Web : téléchargement via lien
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  onProgress?.(100);
}
