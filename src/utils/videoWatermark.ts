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

/** Durée en secondes avant de changer de côté */
const WATERMARK_SWITCH_INTERVAL = 6;

/**
 * Charge le logo de l'app en tant qu'image pour le watermark.
 * Mis en cache après le premier chargement.
 */
let cachedLogoImage: HTMLImageElement | null = null;
let logoLoadPromise: Promise<HTMLImageElement | null> | null = null;

async function loadLogoImage(): Promise<HTMLImageElement | null> {
  if (cachedLogoImage) return cachedLogoImage;
  if (logoLoadPromise) return logoLoadPromise;

  logoLoadPromise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Supprimer le fond blanc/clair du logo via manipulation de pixels
      try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.naturalWidth;
        tempCanvas.height = img.naturalHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(img, 0, 0);
          const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
          const data = imageData.data;
          // Rendre transparents les pixels blancs ou proches du blanc
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r > 230 && g > 230 && b > 230) {
              data[i + 3] = 0; // Alpha → 0 (transparent)
            }
          }
          tempCtx.putImageData(imageData, 0, 0);
          // Créer une nouvelle image nettoyée
          const cleanImg = new Image();
          cleanImg.onload = () => {
            cachedLogoImage = cleanImg;
            resolve(cleanImg);
          };
          cleanImg.onerror = () => {
            cachedLogoImage = img;
            resolve(img);
          };
          cleanImg.src = tempCanvas.toDataURL('image/png');
          return;
        }
      } catch (e) {
        console.warn('⚠️ Impossible de nettoyer le fond du logo:', e);
      }
      cachedLogoImage = img;
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = new URL('../assets/educatok-logo.png', import.meta.url).href;
  });

  return logoLoadPromise;
}

/**
 * Dessine le watermark TikTok-style sur un canvas.
 * Alterne gauche (0-6s) / droite (6-12s) / gauche… toutes les 6 secondes.
 * Affiche le logo de l'app + le texte "EducaTok" + @user en dessous.
 */
function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  watermarkText: string,
  authorName: string,
  currentTime: number,
  logoImage: HTMLImageElement | null
) {
  ctx.save();

  const paddingX = Math.round(width * 0.04);
  const paddingY = Math.round(height * 0.06);

  // Déterminer le côté selon le temps (alterne toutes les 6s)
  const cycle = Math.floor(currentTime / WATERMARK_SWITCH_INTERVAL);
  const isRight = cycle % 2 === 1;

  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth = Math.max(2, Math.round(width * 0.003));
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  const logoIconSize = Math.round(width * 0.09); // taille du logo image
  const textSize = Math.max(18, Math.round(width * 0.042));
  const authorSize = Math.max(14, Math.round(width * 0.032));

  // Position Y centrée verticalement
  const blockHeight = logoIconSize + Math.round(textSize * 1.2) + Math.round(authorSize * 1.2);
  const startY = Math.round((height - blockHeight) / 2);

  // Position X selon le côté
  const xAnchor = isRight ? width - paddingX : paddingX;
  ctx.textAlign = isRight ? 'right' : 'left';
  ctx.textBaseline = 'top';

  // 1. Logo image
  if (logoImage) {
    const logoX = isRight ? xAnchor - logoIconSize : xAnchor;
    ctx.shadowBlur = 12;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(logoImage, logoX, startY, logoIconSize, logoIconSize);
  }

  // 2. Texte "EducaTok" sous le logo
  ctx.globalAlpha = 0.8;
  ctx.shadowBlur = 8;
  const textY = startY + logoIconSize + Math.round(textSize * 0.3);
  ctx.font = `bold ${textSize}px "Arial", sans-serif`;
  ctx.strokeText(watermarkText, xAnchor, textY);
  ctx.fillText(watermarkText, xAnchor, textY);

  // 3. @user sous le texte
  const authorY = textY + Math.round(textSize * 1.3);
  ctx.font = `600 ${authorSize}px "Arial", sans-serif`;
  ctx.strokeText(`@${authorName}`, xAnchor, authorY);
  ctx.fillText(`@${authorName}`, xAnchor, authorY);

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

  // Fallback web: clic synchrone (évite le blocage mobile avec setTimeout)
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  a.style.display = 'none';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  onProgress?.(100);
}

/**
 * Télécharge une vidéo et l'encode avec un watermark via Canvas + MediaRecorder.
 * Le watermark est appliqué sur toutes les plateformes (web + mobile).
 */
export async function downloadVideoWithWatermark({
  videoUrl,
  watermarkText,
  authorName,
  fileName,
  onProgress,
  onStageChange,
}: DownloadOptions): Promise<void> {
  // Watermark sur toutes les plateformes (desktop + mobile)
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

      // Précharger le logo
      const logoImg = await loadLogoImage();

      const renderFrame = () => {
        if (video.ended || video.paused) {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          return;
        }

        ctx.drawImage(video, 0, 0, width, height);
        drawWatermark(ctx, width, height, watermarkText, authorName, video.currentTime, logoImg);

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
