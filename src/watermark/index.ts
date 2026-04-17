/**
 * Point d'entrée du système de watermark vidéo.
 *
 * Le watermark est impérativement généré côté serveur via FFmpeg.
 * Aucun traitement client-side (Canvas, MediaRecorder, CSS overlay) n'est utilisé.
 */

import { WatermarkOptions } from './types';
import { saveVideoBlob } from './utils/videoSaver';

export type { WatermarkOptions } from './types';

/**
 * Télécharge une vidéo avec watermark en utilisant le traitement serveur FFmpeg.
 */
export async function downloadVideoWithWatermark(options: WatermarkOptions): Promise<void> {
  const { fileName, onProgress, onStageChange } = options;

  const { processOnServer } = await import('./strategies/serverStrategy');
  const resultBlob = await processOnServer(options);

  if (!resultBlob) {
    throw new Error("Aucun export watermark n\u2019a été généré");
  }

  const mimeType = 'video/mp4';
  let finalName = fileName;
  if (!finalName.endsWith('.mp4')) {
    finalName = finalName.replace(/\.\w+$/, '.mp4');
  }

  await saveVideoBlob(resultBlob, finalName, mimeType, onProgress, onStageChange);
}
