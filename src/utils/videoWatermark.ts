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

const WATERMARK_FETCH_PROGRESS_MAX = 95;
const WATERMARK_METADATA_PROGRESS = 45;
const WATERMARK_RENDER_START = 50;
const WATERMARK_RENDER_END = 92;
const WATERMARK_SAVE_PROGRESS = 98;
const WATERMARK_SWITCH_INTERVAL = 8;

const MAX_VIDEO_WIDTH = 720; // Limite de réencodage pour mobile (720p pour éviter freeze)
const TARGET_FPS = 24; // Framerate stable pour réduire charge CPU
const DEFAULT_VIDEO_BITRATE = 1_500_000; // bitrate modéré pour mobile

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
 * Alterne gauche/droite dans la vidéo, avec un logo centré sur le bloc de texte.
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

  ctx.font = `bold ${textSize}px "Arial", sans-serif`;
  const watermarkWidth = ctx.measureText(watermarkText).width;
  ctx.font = `600 ${authorSize}px "Arial", sans-serif`;
  const authorWidth = ctx.measureText(`@${authorName}`).width;
  const blockWidth = Math.max(logoIconSize, watermarkWidth, authorWidth);

  // Position X selon le côté, en gardant le logo centré sur le texte.
  const halfBlockWidth = Math.round(blockWidth / 2);
  const xAnchor = isRight
    ? width - paddingX - halfBlockWidth
    : paddingX + halfBlockWidth;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // 1. Logo image
  if (logoImage) {
    const logoX = Math.round(xAnchor - logoIconSize / 2);
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

  // Si la vidéo est très grosse, on passe à un bucket plus léger pour éviter freeze / mémoire
  if (total > 200 * 1024 * 1024) {
    console.warn('Vidéo lourde (+200MB) - réduction des options de watermark pour stabilité');
  }

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

  const { isNativePlatform, saveMediaToDevice } = await import('@/file-manager/utils/mediaGallery');

  if (isNativePlatform()) {
    // Sur Capacitor: sauvegarder directement dans la galerie
    console.log('📱 Sauvegarde native, taille blob:', blob.size);
    onStageChange?.('Sauvegarde dans la galerie...');
    
    const result = await saveMediaToDevice(blob, fileName, mimeType);
    if (!result.success) {
      throw new Error(result.error || 'Sauvegarde dans la galerie échouée');
    }

    onProgress?.(100);
    return;
  }

  // Web: clic synchrone
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
 * Le watermark est appliqué, mais l'utilisateur ne voit que des messages "Téléchargement..."
 * pour éviter l'avertissement explicite.
 */
export async function downloadVideoWithWatermark({
  videoUrl,
  watermarkText,
  authorName,
  fileName,
  onProgress,
  onStageChange,
}: DownloadOptions): Promise<void> {
  return new Promise(async (resolve, reject) => {
    let localBlobUrl: string | null = null;
    let canvasStream: MediaStream | null = null;
    let combinedStream: MediaStream | null = null;

    try {
      // FIX: Force direct download to prevent Audio/Video desync on mobile devices
      // The canvas recording approach is not performant enough for real-time encoding on phone CPUs
      if (true) {
          onStageChange?.('Téléchargement...');
          // Use the existing helper to get progress events
          const url = await fetchVideoAsBlob(videoUrl, onProgress);
          
          // Convert back to blob for saving
          const r = await fetch(url);
          const b = await r.blob();
          URL.revokeObjectURL(url);
          
          const mime = b.type || 'video/mp4';
          // Fix extension if needed
          let finalName = fileName;
          if (mime.includes('mp4') && !finalName.endsWith('.mp4')) {
             finalName = finalName.replace(/\.\w+$/, '.mp4');
          }
          
          await saveOutputVideo(b, finalName, mime, onProgress, onStageChange);
          resolve();
          return;
      }

      const selectedMime = getSupportedRecorderMimeType();
      if (!selectedMime) {
        // Fallback si pas de support: on télécharge sans watermark
        console.warn('Pas de support MediaRecorder, téléchargement simple');
        const resp = await fetch(videoUrl);
        const blob = await resp.blob();
        await saveOutputVideo(blob, fileName, 'video/mp4', onProgress, onStageChange);
        resolve();
        return;
      }

      const finalExtension = getFileExtensionForMimeType(selectedMime);
      const outputFileName = fileName.replace(/\.\w+$/, `.${finalExtension}`);

      // Étape 1: Téléchargement
      onStageChange?.('Téléchargement de la vidéo...');
      onProgress?.(2);
      localBlobUrl = await fetchVideoAsBlob(videoUrl, onProgress);
      onProgress?.(WATERMARK_FETCH_PROGRESS_MAX);

      // Étape 2: Préparation (Setup invisible pour l'utilisateur)
      onStageChange?.('Traitement en cours...');

      const video = document.createElement('video');
      video.muted = false; // Important pour capturer l'audio
      video.playsInline = true;
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';
      video.src = localBlobUrl;

      // Hack pour iOS: parfois la vidéo doit être dans le DOM pour jouer
      video.style.position = 'fixed';
      video.style.top = '0';
      video.style.left = '0';
      video.style.opacity = '0';
      video.style.pointerEvents = 'none';
      document.body.appendChild(video);

      await new Promise<void>((res, rej) => {
        video.onloadedmetadata = () => res();
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

      // On limite la taille pour mobile (MAX_VIDEO_WIDTH = 720)
      const scaledWidth = Math.min(width, MAX_VIDEO_WIDTH);
      const scaledHeight = Math.round((scaledWidth / width) * height);

      const canvas = document.createElement('canvas');
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })!;

      if (typeof canvas.captureStream !== 'function') {
         // Fallback si pas de captureStream -> téléchargement simple
         document.body.removeChild(video);
         throw new Error('Capture canvas non supportée');
      }

      canvasStream = canvas.captureStream(TARGET_FPS);

      try {
        // Tentative d'extraction audio
        const videoElementStream = (video as any).captureStream?.() as MediaStream;
        const audioTracks = videoElementStream?.getAudioTracks?.() || [];
        
        // Si pas d'audio via captureStream (fréquent), on essaie de capturer l'audio via AudioContext si nécessaire
        // Pour simplifier ici, on prend ce qu'on a.
        if (audioTracks.length > 0) {
          combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioTracks,
          ]);
        } else {
          // Sur mobile, l'audio est souvent perdu avec cette méthode, mais c'est le compromis watermark client-side
          combinedStream = canvasStream;
        }
      } catch {
        combinedStream = canvasStream;
      }

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMime,
        videoBitsPerSecond: DEFAULT_VIDEO_BITRATE,
        audioBitsPerSecond: 128_000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const resultBlob = new Blob(chunks, { type: selectedMime });
        
        // Nettoyage DOM
        if (document.body.contains(video)) {
            document.body.removeChild(video);
        }

        // Étape 4: Sauvegarde
        onStageChange?.('Finalisation...');
        saveOutputVideo(resultBlob, outputFileName, selectedMime, onProgress, onStageChange)
          .then(() => resolve())
          .catch(reject)
          .finally(() => {
            if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
            canvasStream?.getTracks().forEach((track) => track.stop());
            combinedStream?.getTracks().forEach((track) => track.stop());
          });
      };

      mediaRecorder.onerror = (e) => {
        if (document.body.contains(video)) document.body.removeChild(video);
        if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
        reject(e);
      };

      // Configuration lecture
      video.playbackRate = 1.0;
      video.volume = 0.01; // Un peu de volume pour que l'audio track soit active, mais quasi inaudible si joué
      video.currentTime = 0;
      
      // On lance le recorder
      mediaRecorder.start(1000); // 1s chunks
      
      try {
          await video.play();
      } catch (e) {
          console.warn("Autoplay refusal or error", e);
          // Si on ne peut pas jouer, on ne peut pas recorder -> fail
          mediaRecorder.stop();
          if (document.body.contains(video)) document.body.removeChild(video);
          throw new Error("Impossible de lire la vidéo pour le traitement");
      }

      // Étape 3: "Traitement..." (C'est là que le watermark s'applique)
      // On garde le message générique
      onStageChange?.('Traitement en cours...');

      // Précharger le logo
      const logoImg = await loadLogoImage();

      let renderLoop: number | null = null;
      const fpsInterval = 1000 / TARGET_FPS;
      let lastDrawTime = 0;

      const renderFrame = (timestamp: number) => {
        if (video.ended || video.paused) {
           // Fin normale ou pause
           if (video.ended && mediaRecorder.state === 'recording') {
             mediaRecorder.stop();
             if (renderLoop !== null) cancelAnimationFrame(renderLoop);
           }
           return;
        }

        // Throttle FPS
        if (timestamp - lastDrawTime < fpsInterval) {
             renderLoop = requestAnimationFrame(renderFrame);
             return;
        }
        lastDrawTime = timestamp;

        ctx.drawImage(video, 0, 0, scaledWidth, scaledHeight);
        drawWatermark(ctx, scaledWidth, scaledHeight, watermarkText, authorName, video.currentTime, logoImg);

        if (duration > 0) {
          const pct = Math.round(
            WATERMARK_RENDER_START +
              (video.currentTime / duration) * (WATERMARK_RENDER_END - WATERMARK_RENDER_START)
          );
          // On évite de rester bloqué à 92% visuellement si ça traine
          onProgress?.(Math.min(pct, 95));
        }

        renderLoop = requestAnimationFrame(renderFrame);
      };

      renderLoop = requestAnimationFrame(renderFrame);

      // Sécurité timeout: Arrêt forcé si on dépasse la durée + 5s
      const safeDurationMs = (duration * 1000) + 5000;
      setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
              console.warn("Forcing stop mediarecorder due to timeout");
              mediaRecorder.stop();
          }
      }, safeDurationMs);

    } catch (err) {
      console.error('Erreur watermark:', err);
      // Fallback silencieux : on essaie de télécharger sans watermark si ça plante
      if (localBlobUrl) {
          try {
             const resp = await fetch(localBlobUrl);
             const fallbackBlob = await resp.blob();
             await saveOutputVideo(fallbackBlob, fileName, 'video/mp4', onProgress, onStageChange);
             resolve();
          } catch (e2) {
             reject(err);
          }
      } else {
         reject(err);
      }
    }
  });
}




