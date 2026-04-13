/**
 * Stratégie Canvas+MediaRecorder : applique le watermark en temps réel côté client.
 * Fonctionne sur Web (desktop et mobile avec support MediaRecorder).
 */

import { WatermarkOptions, WATERMARK_CONSTANTS } from '../types';
import { fetchVideoAsBlob } from '../utils/videoFetcher';
import { drawWatermark } from '../utils/watermarkRenderer';
import { loadLogoImage } from '../utils/logoLoader';
import { getSupportedRecorderMimeType, getFileExtension } from '../utils/mediaRecorderHelper';

export async function processWithCanvas(options: WatermarkOptions): Promise<Blob> {
  const { videoUrl, watermarkText, authorName, onProgress, onStageChange } = options;

  const selectedMime = getSupportedRecorderMimeType();
  if (!selectedMime) {
    throw new Error('MediaRecorder non supporté');
  }

  // 1. Télécharger la vidéo
  onStageChange?.('Téléchargement de la vidéo...');
  onProgress?.(2);
  const videoBlob = await fetchVideoAsBlob(videoUrl, onProgress, WATERMARK_CONSTANTS.FETCH_PROGRESS_MAX);
  const localBlobUrl = URL.createObjectURL(videoBlob);

  try {
    // 2. Préparer l'élément vidéo
    onStageChange?.('Traitement en cours...');
    const video = document.createElement('video');
    video.muted = false;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    video.src = localBlobUrl;
    video.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(video);

    try {
      await new Promise<void>((res, rej) => {
        video.onloadedmetadata = () => res();
        video.onerror = () => rej(new Error('Impossible de charger la vidéo'));
        video.load();
      });

      const { videoWidth: w, videoHeight: h, duration } = video;
      if (!w || !h || !duration || duration === Infinity) {
        throw new Error('Métadonnées vidéo invalides');
      }

      onProgress?.(WATERMARK_CONSTANTS.RENDER_START);

      const scaledWidth = Math.min(w, WATERMARK_CONSTANTS.MAX_VIDEO_WIDTH);
      const scaledHeight = Math.round((scaledWidth / w) * h);

      const canvas = document.createElement('canvas');
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })!;

      if (typeof canvas.captureStream !== 'function') {
        throw new Error('captureStream non supporté');
      }

      const canvasStream = canvas.captureStream(WATERMARK_CONSTANTS.TARGET_FPS);
      let combinedStream: MediaStream;

      try {
        const videoStream = (video as any).captureStream?.() as MediaStream;
        const audioTracks = videoStream?.getAudioTracks?.() || [];
        combinedStream = audioTracks.length > 0
          ? new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks])
          : canvasStream;
      } catch {
        combinedStream = canvasStream;
      }

      const logoImg = await loadLogoImage();

      return await new Promise<Blob>((resolve, reject) => {
        const mediaRecorder = new MediaRecorder(combinedStream, {
          mimeType: selectedMime,
          videoBitsPerSecond: WATERMARK_CONSTANTS.DEFAULT_VIDEO_BITRATE,
          audioBitsPerSecond: 128_000,
        });

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          canvasStream.getTracks().forEach(t => t.stop());
          combinedStream.getTracks().forEach(t => t.stop());
          resolve(new Blob(chunks, { type: selectedMime }));
        };

        mediaRecorder.onerror = () => reject(new Error('Erreur MediaRecorder'));

        mediaRecorder.start(1000);
        video.playbackRate = 1.0;
        video.volume = 0.01;
        video.currentTime = 0;

        video.play().catch(() => {
          mediaRecorder.stop();
          reject(new Error('Impossible de lire la vidéo'));
        });

        const fpsInterval = 1000 / WATERMARK_CONSTANTS.TARGET_FPS;
        let lastDrawTime = 0;

        const renderFrame = (timestamp: number) => {
          if (video.ended || video.paused) {
            if (video.ended && mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
            return;
          }

          if (timestamp - lastDrawTime < fpsInterval) {
            requestAnimationFrame(renderFrame);
            return;
          }
          lastDrawTime = timestamp;

          ctx.drawImage(video, 0, 0, scaledWidth, scaledHeight);
          drawWatermark(ctx, scaledWidth, scaledHeight, watermarkText, authorName, video.currentTime, logoImg);

          const pct = Math.round(
            WATERMARK_CONSTANTS.RENDER_START +
            (video.currentTime / duration) * (WATERMARK_CONSTANTS.RENDER_END - WATERMARK_CONSTANTS.RENDER_START)
          );
          onProgress?.(Math.min(pct, 95));
          requestAnimationFrame(renderFrame);
        };

        requestAnimationFrame(renderFrame);

        // Timeout de sécurité
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            console.warn('Forçage arrêt MediaRecorder (timeout)');
            mediaRecorder.stop();
          }
        }, (duration * 1000) + 5000);
      });
    } finally {
      if (document.body.contains(video)) document.body.removeChild(video);
    }
  } finally {
    URL.revokeObjectURL(localBlobUrl);
  }
}
