/**
 * Stratégie de téléchargement direct : télécharge la vidéo sans watermark.
 * Fallback utilisé quand Canvas/MediaRecorder n'est pas disponible.
 */

import { WatermarkOptions } from '../types';
import { fetchVideoAsBlob } from '../utils/videoFetcher';

export async function processDirectDownload(options: WatermarkOptions): Promise<Blob> {
  const { videoUrl, onProgress, onStageChange } = options;

  onStageChange?.('Téléchargement...');
  const blob = await fetchVideoAsBlob(videoUrl, onProgress, 90);
  onProgress?.(90);
  return blob;
}
