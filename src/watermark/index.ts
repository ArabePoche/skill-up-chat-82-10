/**
 * Point d'entrée du système de watermark vidéo.
 * 
 * Sélectionne automatiquement la meilleure stratégie selon la plateforme :
 * 1. Web desktop/mobile avec MediaRecorder → Canvas (watermark côté client)
 * 2. Capacitor natif → Téléchargement direct (le serveur Edge ne supporte pas FFmpeg lourd)
 * 3. Fallback → Téléchargement direct sans watermark
 */

import { WatermarkOptions } from './types';
import { getSupportedRecorderMimeType, getFileExtension } from './utils/mediaRecorderHelper';
import { saveVideoBlob } from './utils/videoSaver';

export type { WatermarkOptions } from './types';

/**
 * Détecte si on est sur une plateforme native Capacitor.
 */
function isCapacitorNative(): boolean {
  return typeof (window as any)?.Capacitor?.isNativePlatform === 'function'
    && (window as any).Capacitor.isNativePlatform();
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

  try {
    let resultBlob: Blob;
    let mimeType = 'video/mp4';

    if (canUseCanvasWatermark()) {
      // Stratégie Canvas : watermark client-side en temps réel
      console.log('🎨 Watermark: stratégie Canvas');
      const { processWithCanvas } = await import('./strategies/canvasStrategy');
      resultBlob = await processWithCanvas(options);
      const supportedMime = getSupportedRecorderMimeType();
      if (supportedMime) mimeType = supportedMime;
    } else {
      // Fallback : téléchargement direct (pas de watermark côté client)
      console.log('📥 Watermark: téléchargement direct (fallback)');
      const { processDirectDownload } = await import('./strategies/directDownloadStrategy');
      resultBlob = await processDirectDownload(options);
    }

    // Déterminer le nom final
    const ext = getFileExtension(mimeType);
    let finalName = fileName;
    if (!finalName.endsWith(`.${ext}`)) {
      finalName = finalName.replace(/\.\w+$/, `.${ext}`);
    }

    // Sauvegarder (galerie native ou téléchargement web)
    await saveVideoBlob(resultBlob, finalName, mimeType, onProgress, onStageChange);
  } catch (err) {
    console.error('❌ Erreur watermark:', err);
    
    // Fallback ultime : téléchargement direct sans traitement
    try {
      onStageChange?.('Téléchargement de secours...');
      const { processDirectDownload } = await import('./strategies/directDownloadStrategy');
      const blob = await processDirectDownload(options);
      const finalName = fileName.replace(/\.\w+$/, '.mp4');
      await saveVideoBlob(blob, finalName, 'video/mp4', onProgress, onStageChange);
    } catch (e2) {
      throw err; // On relance l'erreur originale
    }
  }
}
