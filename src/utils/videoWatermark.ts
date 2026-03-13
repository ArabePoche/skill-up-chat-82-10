/**
 * Utilitaire pour télécharger une vidéo avec un watermark style TikTok
 * Télécharge d'abord la vidéo en blob local pour éviter les problèmes CORS,
 * puis utilise Canvas + MediaRecorder pour encoder avec le watermark.
 * Inclut la piste audio originale pour compatibilité VLC.
 */

interface DownloadOptions {
  videoUrl: string;
  watermarkText: string;
  authorName: string;
  fileName: string;
  onProgress?: (percent: number) => void;
  onStageChange?: (stage: string) => void;
}

const WATERMARK_FETCH_PROGRESS_MAX = 35;
const WATERMARK_METADATA_PROGRESS = 45;
const WATERMARK_RENDER_START = 50;
const WATERMARK_RENDER_END = 92;
const WATERMARK_SAVE_PROGRESS = 97;

/**
 * Dessine le watermark TikTok-style sur un canvas
 */
function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  watermarkText: string,
  authorName: string
) {
  ctx.save();

  // — Watermark principal en haut à gauche —
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0,0,0,0.95)';
  ctx.lineWidth = Math.max(2, Math.round(width * 0.003));
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  const mainSize = Math.max(24, Math.round(width * 0.06));
  ctx.font = `bold ${mainSize}px "Arial", sans-serif`;
  ctx.textAlign = 'left';
  ctx.strokeText(watermarkText, 20, mainSize + 18);
  ctx.fillText(watermarkText, 20, mainSize + 18);

  // — Nom de l'auteur en bas à gauche —
  const authorSize = Math.max(18, Math.round(width * 0.042));
  ctx.font = `600 ${authorSize}px "Arial", sans-serif`;
  ctx.strokeText(`@${authorName}`, 20, height - 24);
  ctx.fillText(`@${authorName}`, 20, height - 24);

  // — Watermark répété en diagonale au centre —
  ctx.globalAlpha = 0.22;
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = Math.max(1.5, Math.round(width * 0.002));
  const diagSize = Math.max(34, Math.round(width * 0.085));
  ctx.font = `bold ${diagSize}px "Arial", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  for (let row = -3; row <= 3; row++) {
    for (let col = -3; col <= 3; col++) {
      const x = col * width * 0.28;
      const y = row * height * 0.18;
      ctx.strokeText(watermarkText, x, y);
      ctx.fillText(watermarkText, x, y);
    }
  }

  ctx.restore();
}

/**
 * Télécharge le fichier vidéo en blob local pour éviter le CORS
 */
async function fetchVideoAsBlob(
  videoUrl: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const response = await fetch(videoUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  const reader = response.body?.getReader();
  if (!reader) throw new Error('ReadableStream non supporté');

  const chunks: BlobPart[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total > 0) {
      onProgress?.(Math.round((loaded / total) * WATERMARK_FETCH_PROGRESS_MAX));
    }
  }

  const blob = new Blob(chunks, { type: 'video/mp4' });
  return URL.createObjectURL(blob);
}

/**
 * Retourne le mime type le plus compatible pour MediaRecorder.
 */
function getSupportedRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    return '';
  }

  const mimeTypes = [
    'video/mp4;codecs=h264,aac',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];

  for (const mime of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }

  return '';
}

/**
 * Retourne l'extension du fichier selon le mime type final.
 */
function getFileExtensionForMimeType(mimeType: string): string {
  if (mimeType.includes('mp4')) {
    return 'mp4';
  }

  return 'webm';
}

/**
 * Sauvegarde un blob vidéo final sur l'appareil ou via téléchargement web.
 */
async function saveOutputVideo(
  blob: Blob,
  fileName: string,
  mimeType: string,
  onProgress?: (percent: number) => void,
  onStageChange?: (stage: string) => void
): Promise<void> {
  onStageChange?.('Enregistrement de la vidéo');
  onProgress?.(WATERMARK_SAVE_PROGRESS);

  try {
    const { isNativePlatform, saveMediaToDevice } = await import('@/file-manager/utils/mediaGallery');
    if (isNativePlatform()) {
      const result = await saveMediaToDevice(blob, fileName, mimeType);
      if (!result.success) {
        throw new Error(result.error || 'Sauvegarde dans la galerie échouée');
      }

      onProgress?.(100);
      return;
    }
  } catch (error) {
    console.log('📱 Fallback web pour le téléchargement vidéo');
  }

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
}

/**
 * Détecte si on est sur un appareil mobile (navigateur web mobile)
 */
function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Téléchargement direct MP4 sur mobile (sans watermark, compatible partout)
 * Utilise saveMediaToDevice sur natif, sinon window.open en fallback web mobile
 */
async function downloadDirectMp4(
  videoUrl: string,
  fileName: string,
  onProgress?: (percent: number) => void,
  onStageChange?: (stage: string) => void
): Promise<void> {
  onStageChange?.('Téléchargement de la vidéo');
  onProgress?.(2);

  // Télécharger la vidéo en blob
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
      onProgress?.(Math.round((loaded / total) * 85));
    }
  }

  const blob = new Blob(chunks, { type: 'video/mp4' });
  const mp4FileName = fileName.replace(/\.\w+$/, '.mp4');

  onStageChange?.('Enregistrement de la vidéo');
  onProgress?.(90);

  // Essayer la sauvegarde native (Capacitor)
  try {
    const { isNativePlatform, saveMediaToDevice } = await import('@/file-manager/utils/mediaGallery');
    if (isNativePlatform()) {
      const result = await saveMediaToDevice(blob, mp4FileName, 'video/mp4');
      if (!result.success) {
        throw new Error(result.error || 'Sauvegarde échouée');
      }
      onProgress?.(100);
      return;
    }
  } catch {
    console.log('📱 Fallback web mobile pour le téléchargement vidéo');
  }

  // Fallback web mobile: utiliser un lien avec URL blob + window.open
  const blobUrl = URL.createObjectURL(blob);
  onProgress?.(95);

  // Sur mobile web, window.open est plus fiable que <a>.click()
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = mp4FileName;
  link.style.display = 'none';
  document.body.appendChild(link);

  // Forcer le clic de façon synchrone (pas dans un setTimeout)
  link.click();
  document.body.removeChild(link);

  // Petit délai puis libérer la mémoire
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  onProgress?.(100);
}

/**
 * Télécharge une vidéo et l'encode avec un watermark via Canvas + MediaRecorder.
 * Sur mobile: télécharge le MP4 original directement (compatible partout).
 * Sur desktop: re-encode avec watermark via Canvas.
 */
export async function downloadVideoWithWatermark({
  videoUrl,
  watermarkText,
  authorName,
  fileName,
  onProgress,
  onStageChange,
}: DownloadOptions): Promise<void> {
  // Sur mobile, télécharger directement le MP4 sans watermark
  if (isMobileDevice()) {
    return downloadDirectMp4(videoUrl, fileName, onProgress, onStageChange);
  }

  return new Promise(async (resolve, reject) => {
    let localBlobUrl: string | null = null;
    let canvasStream: MediaStream | null = null;
    let combinedStream: MediaStream | null = null;

    try {
      const selectedMime = getSupportedRecorderMimeType();
      if (!selectedMime) {
        throw new Error('Votre appareil ne supporte pas l\'encodage vidéo avec watermark');
      }

      const finalExtension = getFileExtensionForMimeType(selectedMime);
      const outputFileName = fileName.replace(/\.\w+$/, `.${finalExtension}`);

      onStageChange?.('Téléchargement de la vidéo');
      onProgress?.(2);
      localBlobUrl = await fetchVideoAsBlob(videoUrl, onProgress);
      onProgress?.(WATERMARK_FETCH_PROGRESS_MAX);
      onStageChange?.('Préparation du watermark');

      const video = document.createElement('video');
      video.muted = false;
      video.playsInline = true;
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';
      video.src = localBlobUrl;

      await new Promise<void>((res, rej) => {
        video.oncanplaythrough = () => res();
        video.onerror = () => rej(new Error('Impossible de charger la vidéo'));
        video.load();
      });

      const width = video.videoWidth;
      const height = video.videoHeight;
      const duration = video.duration;

      if (!width || !height || !duration || duration === Infinity) {
        throw new Error('Métadonnées vidéo invalides');
      }

      onProgress?.(WATERMARK_METADATA_PROGRESS);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      if (typeof canvas.captureStream !== 'function') {
        throw new Error('Le captureStream du canvas est indisponible sur cet appareil');
      }

      canvasStream = canvas.captureStream(30);

      try {
        const videoElementStream = (video as any).captureStream() as MediaStream;
        const audioTracks = videoElementStream.getAudioTracks();
        if (audioTracks.length > 0) {
          combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioTracks,
          ]);
        } else {
          combinedStream = canvasStream;
        }
      } catch {
        combinedStream = canvasStream;
      }

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 4_000_000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: selectedMime });
        void saveOutputVideo(blob, outputFileName, selectedMime, onProgress, onStageChange)
          .then(() => {
            resolve();
          })
          .catch((error) => {
            reject(error);
          })
          .finally(() => {
            if (localBlobUrl) {
              URL.revokeObjectURL(localBlobUrl);
              localBlobUrl = null;
            }
            canvasStream?.getTracks().forEach((track) => track.stop());
            combinedStream?.getTracks().forEach((track) => track.stop());
          });
      };

      mediaRecorder.onerror = (e) => {
        if (localBlobUrl) {
          URL.revokeObjectURL(localBlobUrl);
          localBlobUrl = null;
        }
        canvasStream?.getTracks().forEach((track) => track.stop());
        combinedStream?.getTracks().forEach((track) => track.stop());
        reject(e);
      };

      video.playbackRate = 1.0;
      video.volume = 0;
      mediaRecorder.start(100);
      video.currentTime = 0;
      await video.play();
      onStageChange?.('Application du watermark');

      const renderFrame = () => {
        if (video.ended || video.paused) {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          return;
        }

        ctx.drawImage(video, 0, 0, width, height);
        drawWatermark(ctx, width, height, watermarkText, authorName);

        if (duration > 0) {
          const pct = Math.round(
            WATERMARK_RENDER_START +
              (video.currentTime / duration) * (WATERMARK_RENDER_END - WATERMARK_RENDER_START)
          );
          onProgress?.(Math.min(pct, WATERMARK_RENDER_END));
        }

        requestAnimationFrame(renderFrame);
      };

      requestAnimationFrame(renderFrame);

      video.onended = () => {
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 300);
      };

    } catch (error) {
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
      canvasStream?.getTracks().forEach((track) => track.stop());
      combinedStream?.getTracks().forEach((track) => track.stop());
      reject(error);
    }
  });
}
