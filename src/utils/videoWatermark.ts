/**
 * Utilitaire pour télécharger une vidéo avec watermark visuel
 * Télécharge la vidéo en blob local pour éviter les problèmes CORS,
 * puis déclenche le téléchargement du fichier original.
 * 
 * Note: Le watermark est appliqué uniquement lors de la lecture in-app
 * car le re-encoding via MediaRecorder produit des fichiers incompatibles
 * avec la plupart des lecteurs (VLC, etc.)
 */

interface DownloadOptions {
  videoUrl: string;
  watermarkText: string;
  authorName: string;
  fileName: string;
  onProgress?: (percent: number) => void;
}

/**
 * Télécharge le fichier vidéo en blob local pour éviter le CORS
 * puis déclenche le téléchargement
 */
export async function downloadVideoWithWatermark({
  videoUrl,
  fileName,
  onProgress,
}: DownloadOptions): Promise<void> {
  try {
    onProgress?.(5);

    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    const reader = response.body?.getReader();
    if (!reader) throw new Error('ReadableStream non supporté');

    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      if (total > 0) {
        onProgress?.(Math.round(5 + (loaded / total) * 85));
      }
    }

    onProgress?.(92);

    const blob = new Blob(chunks, { type: 'video/mp4' });
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    a.style.display = 'none';
    a.rel = 'noopener';
    document.body.appendChild(a);

    setTimeout(() => {
      a.click();
      document.body.removeChild(a);
    }, 0);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

    onProgress?.(100);
  } catch (error) {
    console.error('Erreur téléchargement vidéo:', error);
    throw error;
  }
}
