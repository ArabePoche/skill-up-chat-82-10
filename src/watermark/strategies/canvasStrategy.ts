/**
 * Stratégie Canvas+MediaRecorder : applique le watermark en temps réel côté client.
 * Utilise captureStream(0) + requestFrame() pour synchroniser audio et vidéo.
 */

import { WatermarkOptions, WATERMARK_CONSTANTS } from '../types';
import { fetchVideoAsBlob } from '../utils/videoFetcher';
import { drawWatermark } from '../utils/watermarkRenderer';
import { loadLogoImage } from '../utils/logoLoader';
import { getSupportedRecorderMimeType } from '../utils/mediaRecorderHelper';

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
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    video.src = localBlobUrl;
    video.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;z-index:-9999';
    document.body.appendChild(video);

    try {
      // Attendre que la vidéo soit entièrement chargeable
      await new Promise<void>((res, rej) => {
        video.oncanplaythrough = () => res();
        video.onerror = () => rej(new Error('Impossible de charger la vidéo'));
        video.load();
      });

      const { videoWidth: w, videoHeight: h, duration } = video;
      if (!w || !h || !duration || duration === Infinity) {
        throw new Error('Métadonnées vidéo invalides');
      }

      onProgress?.(WATERMARK_CONSTANTS.RENDER_START);

      // Garder la résolution originale pour éviter le ralentissement du rendu
      const scaledWidth = Math.min(w, WATERMARK_CONSTANTS.MAX_VIDEO_WIDTH);
      const scaledHeight = Math.round((scaledWidth / w) * h);
      
      console.log(`[Watermark] Vidéo: ${w}x${h} → Canvas: ${scaledWidth}x${scaledHeight}, durée: ${duration}s`);

      const canvas = document.createElement('canvas');
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      const ctx = canvas.getContext('2d', { alpha: false })!;

      if (typeof canvas.captureStream !== 'function') {
        throw new Error('captureStream non supporté');
      }

      // captureStream(0) = mode manuel : on contrôle exactement quand une frame est émise
      const canvasStream = canvas.captureStream(0);
      const canvasVideoTrack = canvasStream.getVideoTracks()[0];

      // Extraire l'audio depuis la vidéo source
      let combinedStream: MediaStream;
      try {
        // Muter la vidéo pour éviter le son dans les haut-parleurs
        // mais capturer le stream AVANT de muter pour avoir l'audio
        video.muted = false;
        video.volume = 0;
        const videoStream = (video as any).captureStream?.() as MediaStream;
        const audioTracks = videoStream?.getAudioTracks?.() || [];
        if (audioTracks.length > 0) {
          combinedStream = new MediaStream([canvasVideoTrack, ...audioTracks]);
        } else {
          combinedStream = canvasStream;
        }
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

        // Démarrer l'enregistrement
        mediaRecorder.start(250);
        video.playbackRate = 1.0;
        video.currentTime = 0;

        // Utiliser un intervalle fixe au lieu de requestAnimationFrame
        // pour garantir un rythme constant et éviter que la vidéo traîne
        const FPS = 30;
        const frameInterval = 1000 / FPS;
        let intervalId: ReturnType<typeof setInterval> | null = null;
        let stopped = false;

        const stopRecording = () => {
          if (stopped) return;
          stopped = true;
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          // Dessiner la dernière frame
          ctx.drawImage(video, 0, 0, scaledWidth, scaledHeight);
          drawWatermark(ctx, scaledWidth, scaledHeight, watermarkText, authorName, video.currentTime, logoImg);
          if ((canvasVideoTrack as any).requestFrame) {
            (canvasVideoTrack as any).requestFrame();
          }
          setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          }, 300);
        };

        video.onended = stopRecording;

        video.play().then(() => {
          // Boucle de rendu à intervalle fixe - synchronisé avec la lecture réelle
          intervalId = setInterval(() => {
            if (video.ended || video.paused || stopped) {
              if (video.ended) stopRecording();
              return;
            }

            // Dessiner la frame courante + watermark
            ctx.drawImage(video, 0, 0, scaledWidth, scaledHeight);
            drawWatermark(ctx, scaledWidth, scaledHeight, watermarkText, authorName, video.currentTime, logoImg);

            // Émettre la frame
            if ((canvasVideoTrack as any).requestFrame) {
              (canvasVideoTrack as any).requestFrame();
            }

            // Progression
            const pct = Math.round(
              WATERMARK_CONSTANTS.RENDER_START +
              (video.currentTime / duration) * (WATERMARK_CONSTANTS.RENDER_END - WATERMARK_CONSTANTS.RENDER_START)
            );
            onProgress?.(Math.min(pct, 95));
          }, frameInterval);
        }).catch(() => {
          mediaRecorder.stop();
          reject(new Error('Impossible de lire la vidéo'));
        });

        // Timeout de sécurité
        setTimeout(() => {
          if (!stopped) {
            console.warn('Forçage arrêt MediaRecorder (timeout)');
            stopRecording();
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
