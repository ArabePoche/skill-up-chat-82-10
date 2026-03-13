/**
 * Utilitaire pour télécharger une vidéo avec un watermark style TikTok
 * Utilise Canvas + MediaRecorder pour encoder la vidéo avec le watermark
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
  const now = Date.now();
  const opacity = 0.3 + Math.sin(now / 2000) * 0.05; // Légère pulsation

  ctx.save();

  // — Watermark principal en haut à gauche —
  ctx.globalAlpha = opacity;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  const mainSize = Math.max(16, width * 0.04);
  ctx.font = `bold ${mainSize}px "Arial", sans-serif`;
  ctx.fillText(watermarkText, 20, mainSize + 15);

  // — Nom de l'auteur en bas à gauche —
  const authorSize = Math.max(12, width * 0.03);
  ctx.font = `600 ${authorSize}px "Arial", sans-serif`;
  ctx.fillText(`@${authorName}`, 20, height - 20);

  // — Watermark discret en diagonale au centre —
  ctx.globalAlpha = 0.08;
  ctx.shadowBlur = 0;
  const diagSize = Math.max(24, width * 0.06);
  ctx.font = `bold ${diagSize}px "Arial", sans-serif`;
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.textAlign = 'center';
  ctx.fillText(watermarkText, 0, 0);

  ctx.restore();
}

/**
 * Télécharge une vidéo et l'encode avec un watermark via Canvas + MediaRecorder
 */
export async function downloadVideoWithWatermark({
  videoUrl,
  watermarkText,
  authorName,
  fileName,
  onProgress,
}: DownloadOptions): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Créer un élément vidéo hors-écran
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = videoUrl;

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

      onProgress?.(10);

      // 2. Créer le canvas pour le compositing
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      // 3. Capturer le flux canvas
      const stream = canvas.captureStream(30); // 30 FPS

      // 4. Trouver un codec supporté
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      if (!selectedMime) {
        throw new Error('Aucun codec vidéo supporté');
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 2_500_000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const ext = selectedMime.includes('webm') ? 'webm' : 'mp4';
        const blob = new Blob(chunks, { type: selectedMime });
        const url = URL.createObjectURL(blob);

        // Déclencher le téléchargement
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.replace(/\.mp4$/, `.${ext}`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => URL.revokeObjectURL(url), 5000);
        onProgress?.(100);
        resolve();
      };

      mediaRecorder.onerror = (e) => reject(e);

      // 5. Lire la vidéo et dessiner frame par frame
      mediaRecorder.start(100); // Enregistrer par segments de 100ms
      video.currentTime = 0;
      await video.play();

      const renderFrame = () => {
        if (video.ended || video.paused) {
          mediaRecorder.stop();
          return;
        }

        // Dessiner la frame vidéo
        ctx.drawImage(video, 0, 0, width, height);

        // Dessiner le watermark par-dessus
        drawWatermark(ctx, width, height, watermarkText, authorName);

        // Progression
        if (duration > 0) {
          const pct = Math.round(10 + (video.currentTime / duration) * 85);
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
        }, 200);
      };

    } catch (error) {
      reject(error);
    }
  });
}
