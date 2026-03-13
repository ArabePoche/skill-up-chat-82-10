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
}

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
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  const mainSize = Math.max(18, Math.round(width * 0.045));
  ctx.font = `bold ${mainSize}px "Arial", sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(watermarkText, 20, mainSize + 15);

  // — Nom de l'auteur en bas à gauche —
  const authorSize = Math.max(14, Math.round(width * 0.035));
  ctx.font = `600 ${authorSize}px "Arial", sans-serif`;
  ctx.fillText(`@${authorName}`, 20, height - 20);

  // — Watermark répété en diagonale au centre —
  ctx.globalAlpha = 0.1;
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  const diagSize = Math.max(28, Math.round(width * 0.07));
  ctx.font = `bold ${diagSize}px "Arial", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  for (let row = -2; row <= 2; row++) {
    for (let col = -2; col <= 2; col++) {
      ctx.fillText(watermarkText, col * width * 0.4, row * height * 0.25);
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
      onProgress?.(Math.round((loaded / total) * 40));
    }
  }

  const blob = new Blob(chunks, { type: 'video/mp4' });
  return URL.createObjectURL(blob);
}

/**
 * Télécharge une vidéo et l'encode avec un watermark via Canvas + MediaRecorder.
 * Combine la piste vidéo du canvas avec la piste audio de la vidéo originale.
 */
export async function downloadVideoWithWatermark({
  videoUrl,
  watermarkText,
  authorName,
  fileName,
  onProgress,
}: DownloadOptions): Promise<void> {
  return new Promise(async (resolve, reject) => {
    let localBlobUrl: string | null = null;

    try {
      // 1. Télécharger la vidéo en blob local (contourne CORS)
      onProgress?.(2);
      localBlobUrl = await fetchVideoAsBlob(videoUrl, onProgress);
      onProgress?.(40);

      // 2. Créer un élément vidéo depuis le blob local
      const video = document.createElement('video');
      video.muted = false; // Garder l'audio actif
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

      onProgress?.(45);

      // 3. Créer le canvas pour le compositing
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      // 4. Combiner piste vidéo (canvas) + piste audio (vidéo originale)
      const canvasStream = canvas.captureStream(30);

      // Capturer l'audio depuis la vidéo avec captureStream
      // On doit muter la vidéo pour le navigateur mais capturer l'audio
      let combinedStream: MediaStream;
      try {
        const videoElementStream = (video as any).captureStream() as MediaStream;
        const audioTracks = videoElementStream.getAudioTracks();

        if (audioTracks.length > 0) {
          // Combiner les pistes vidéo du canvas + audio de la vidéo
          combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioTracks,
          ]);
        } else {
          combinedStream = canvasStream;
        }
      } catch {
        // Fallback si captureStream n'est pas supporté sur l'élément vidéo
        combinedStream = canvasStream;
      }

      // 5. Trouver un codec supporté
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
      ];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      if (!selectedMime) {
        throw new Error('Aucun codec vidéo supporté par le navigateur');
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
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.replace(/\.\w+$/, '.webm');
        a.style.display = 'none';
        a.rel = 'noopener';
        document.body.appendChild(a);
        setTimeout(() => {
          a.click();
          document.body.removeChild(a);
        }, 0);

        setTimeout(() => {
          URL.revokeObjectURL(url);
          if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
        }, 5000);

        onProgress?.(100);
        resolve();
      };

      mediaRecorder.onerror = (e) => {
        if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
        reject(e);
      };

      // 6. Lecture à vitesse normale pour un encoding correct
      video.playbackRate = 1.0;
      video.volume = 0; // Pas de son dans le navigateur, mais audio capturé
      mediaRecorder.start(100);
      video.currentTime = 0;
      await video.play();

      const renderFrame = () => {
        if (video.ended || video.paused) {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          return;
        }

        // Dessiner la frame vidéo
        ctx.drawImage(video, 0, 0, width, height);

        // Dessiner le watermark par-dessus
        drawWatermark(ctx, width, height, watermarkText, authorName);

        // Progression (45% - 95%)
        if (duration > 0) {
          const pct = Math.round(45 + (video.currentTime / duration) * 50);
          onProgress?.(Math.min(pct, 95));
        }

        requestAnimationFrame(renderFrame);
      };

      requestAnimationFrame(renderFrame);

      // Arrêter l'enregistrement quand la vidéo se termine
      video.onended = () => {
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 300);
      };

    } catch (error) {
      if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
      reject(error);
    }
  });
}
