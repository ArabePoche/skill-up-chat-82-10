/**
 * Point d'entrée du système de watermark vidéo.
 * 
 * Sélectionne automatiquement la meilleure stratégie selon la plateforme :
 * 1. Serveur FFmpeg asynchrone → rendu MP4 robuste
 * 2. Web desktop/mobile compatible → fallback Canvas explicite
 */

import { WatermarkOptions } from './types';
import { getSupportedRecorderMimeType, getFileExtension } from './utils/mediaRecorderHelper';
import { saveVideoBlob } from './utils/videoSaver';

export type { WatermarkOptions } from './types';

type WindowWithCapacitor = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
  };
};

/**
 * Détecte si on est sur une plateforme native Capacitor.
 */
function isCapacitorNative(): boolean {
  const runtimeWindow = window as WindowWithCapacitor;
  return typeof runtimeWindow.Capacitor?.isNativePlatform === 'function'
    && runtimeWindow.Capacitor.isNativePlatform();
}

/**
 * Détecte si le Canvas watermark est utilisable.
 */
function canUseCanvasWatermark(): boolean {
  if (isCapacitorNative()) return false; // Trop lent sur mobile natif
  if (!getSupportedRecorderMimeType()) return false;
  try {
    const c = document.createElement('canvas');
    return typeof c.captureStream === 'function';
  } catch {
    return false;
  }
}

/**
 * Télécharge une vidéo avec watermark en utilisant la meilleure stratégie disponible.
 */
export async function downloadVideoWithWatermark(options: WatermarkOptions): Promise<void> {
  const { fileName, onProgress, onStageChange } = options;

  let resultBlob: Blob;
  let mimeType = 'video/mp4';

  try {
    console.log('🛡️ Watermark: stratégie serveur sécurisée');
    const { processOnServer } = await import('./strategies/serverStrategy');
    resultBlob = await processOnServer(options);
  } catch (serverError) {
    console.error('❌ Erreur watermark serveur:', serverError);

    if (!canUseCanvasWatermark()) {
      throw serverError;
    }

    onStageChange?.('Serveur indisponible, bascule locale de compatibilité...');
    onProgress?.(10);

    console.log('🎨 Watermark: fallback Canvas explicite');
    const { processWithCanvas } = await import('./strategies/canvasStrategy');
    resultBlob = await processWithCanvas(options);
    const supportedMime = getSupportedRecorderMimeType();
    if (supportedMime) mimeType = supportedMime;
  }

  // Déterminer le nom final
  const ext = getFileExtension(mimeType);
  let finalName = fileName;
  if (!finalName.endsWith(`.${ext}`)) {
    finalName = finalName.replace(/\.\w+$/, `.${ext}`);
  }

  // Sauvegarder (galerie native ou téléchargement web)
  await saveVideoBlob(resultBlob, finalName, mimeType, onProgress, onStageChange);
}
