/**
 * Stratégie Canvas+MediaRecorder : applique le watermark en temps réel côté client.
 * Utilise un captureStream à FPS fixe pour préserver la vitesse réelle de lecture.
 */

import { WatermarkOptions, WATERMARK_CONSTANTS } from '../types';
import { fetchVideoAsBlob } from '../utils/videoFetcher';
import { drawWatermark } from '../utils/watermarkRenderer';
import { loadLogoImage } from '../utils/logoLoader';
import { getSupportedRecorderMimeType } from '../utils/mediaRecorderHelper';

// Some browser/runtime combinations expose requestVideoFrameCallback before
// the TypeScript DOM lib available in this project declares the full API.
type VideoFrameRequestCallback = (
  now: DOMHighResTimeStamp,
  metadata: {
    mediaTime: number;
    presentedFrames?: number;
    expectedDisplayTime?: number;
    width?: number;
    height?: number;
    presentationTime?: number;
    captureTime?: number;
  }
) => void;

type HTMLVideoElementWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: VideoFrameRequestCallback) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
  captureStream?: () => MediaStream;
};

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

      const canvasStream = canvas.captureStream(WATERMARK_CONSTANTS.TARGET_FPS);
      const canvasVideoTrack = canvasStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;

      // Extraire l'audio depuis la vidéo source
      let combinedStream: MediaStream;
      try {
        // Capturer l'audio AVANT de muter : muted n'affecte pas les pistes capturées.
        // On utilise muted=true plutôt que volume=0 : volume est en lecture seule sur iOS.
        // Un élément muted=true peut aussi démarrer en autoplay sans geste utilisateur.
        const videoStream = (video as HTMLVideoElementWithFrameCallback).captureStream?.();
        video.muted = true;
        const audioTracks = videoStream?.getAudioTracks?.() || [];
        if (audioTracks.length > 0) {
          combinedStream = new MediaStream([canvasVideoTrack, ...audioTracks]);
        } else {
          if (!videoStream) {
            console.warn('⚠️ captureStream non disponible sur cet élément vidéo - la vidéo sera muette');
          }
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
        const frameReadyVideo = video as HTMLVideoElementWithFrameCallback;
        let intervalId: ReturnType<typeof setInterval> | null = null;
        let videoFrameHandle: number | null = null;
        let stopped = false;
        let lastRenderedMediaTime = 0;

        const emitFrame = (mediaTime = video.currentTime) => {
          lastRenderedMediaTime = mediaTime;
          ctx.drawImage(video, 0, 0, scaledWidth, scaledHeight);
          drawWatermark(ctx, scaledWidth, scaledHeight, watermarkText, authorName, mediaTime, logoImg);

          const pct = Math.round(
            WATERMARK_CONSTANTS.RENDER_START +
              (mediaTime / duration) * (WATERMARK_CONSTANTS.RENDER_END - WATERMARK_CONSTANTS.RENDER_START)
          );
          onProgress?.(Math.min(pct, 95));
        };

        const clearSchedulers = () => {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          if (videoFrameHandle !== null && frameReadyVideo.cancelVideoFrameCallback) {
            frameReadyVideo.cancelVideoFrameCallback(videoFrameHandle);
            videoFrameHandle = null;
          }
        };

        const stopRecording = () => {
          if (stopped) return;
          stopped = true;
          clearSchedulers();
          emitFrame(video.currentTime || lastRenderedMediaTime);
          // Push the final canvas frame to the stream immediately so it is
          // included in the recording before the recorder stops.
          // requestFrame() is always present on CanvasCaptureMediaStreamTrack.
          canvasVideoTrack.requestFrame();
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        };

        const scheduleNextVideoFrame = () => {
          if (stopped || !frameReadyVideo.requestVideoFrameCallback) return;

          videoFrameHandle = frameReadyVideo.requestVideoFrameCallback((_, metadata) => {
            if (video.ended || video.paused || stopped) {
              if (video.ended) stopRecording();
              return;
            }

            // mediaTime matches the decoded frame timing, unlike the callback wall clock.
            emitFrame(metadata.mediaTime);
            scheduleNextVideoFrame();
          });
        };

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          clearSchedulers();
          canvasStream.getTracks().forEach(t => t.stop());
          combinedStream.getTracks().forEach(t => t.stop());
          resolve(new Blob(chunks, { type: selectedMime }));
        };

        mediaRecorder.onerror = () => reject(new Error('Erreur MediaRecorder'));

        video.playbackRate = 1.0;
        video.currentTime = 0;
        video.onended = stopRecording;
        // Pre-fill canvas so the first recorded video frame is not blank.
        emitFrame(0);

        video.play().then(() => {
          // Start the recorder only after the video (and its audio track) has
          // started playing so that audio and canvas recording begin at the
          // same instant, preventing audio from leading the video.
          mediaRecorder.start(250);

          if (frameReadyVideo.requestVideoFrameCallback) {
            scheduleNextVideoFrame();
            return;
          }

          const frameInterval = 1000 / WATERMARK_CONSTANTS.TARGET_FPS;
          intervalId = setInterval(() => {
            if (video.ended || video.paused || stopped) {
              if (video.ended || video.paused) stopRecording();
              return;
            }

            emitFrame(video.currentTime);
          }, frameInterval);
        }).catch(() => {
          clearSchedulers();
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
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
