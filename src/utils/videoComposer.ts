export type StickerPosition = 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right';

export interface OverlayTransform {
  x: number;
  y: number;
  scale: number;
}

export interface StickerOverlayItem {
  id: string;
  emoji: string;
  transform: OverlayTransform;
}

export interface TextOverlayStyle {
  color: string;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
}

export interface TextOverlayItem {
  id: string;
  text: string;
  transform: OverlayTransform;
  style: TextOverlayStyle;
}

interface ComposeVideoOptions {
  videoFile: File;
  stickerEmoji?: string | null;
  stickerPosition?: StickerPosition;
  stickerTransform?: OverlayTransform;
  stickerOverlays?: StickerOverlayItem[];
  textOverlay?: string | null;
  textPosition?: StickerPosition;
  textTransform?: OverlayTransform;
  textOverlays?: TextOverlayItem[];
  audioFile?: File | null;
  onProgress?: (progress: number) => void;
}

interface ThumbnailOptions {
  source: File | string;
  timeSeconds?: number;
  timeRatio?: number;
  stickerEmoji?: string | null;
  stickerPosition?: StickerPosition;
  stickerTransform?: OverlayTransform;
  stickerOverlays?: StickerOverlayItem[];
  textOverlay?: string | null;
  textPosition?: StickerPosition;
  textTransform?: OverlayTransform;
  textOverlays?: TextOverlayItem[];
}

interface VideoElementThumbnailOptions {
  video: HTMLVideoElement;
  stickerEmoji?: string | null;
  stickerPosition?: StickerPosition;
  stickerTransform?: OverlayTransform;
  stickerOverlays?: StickerOverlayItem[];
  textOverlay?: string | null;
  textPosition?: StickerPosition;
  textTransform?: OverlayTransform;
  textOverlays?: TextOverlayItem[];
}

const MAX_COMPOSE_WIDTH = 720;
const TARGET_FPS = 24;
const DEFAULT_VIDEO_BITRATE = 1_800_000;
const MIN_OVERLAY_SCALE = 0.6;
const MAX_OVERLAY_SCALE = 2.6;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getOverlayTransformFromPosition = (
  position: StickerPosition = 'center',
  scale: number = 1
): OverlayTransform => {
  switch (position) {
    case 'top-left':
      return { x: 0.2, y: 0.2, scale };
    case 'top-right':
      return { x: 0.8, y: 0.2, scale };
    case 'bottom-left':
      return { x: 0.2, y: 0.8, scale };
    case 'bottom-right':
      return { x: 0.8, y: 0.8, scale };
    case 'center':
    default:
      return { x: 0.5, y: 0.5, scale };
  }
};

const normalizeOverlayTransform = (
  transform: OverlayTransform | undefined,
  fallbackPosition: StickerPosition,
  fallbackScale: number
) => {
  const base = transform ?? getOverlayTransformFromPosition(fallbackPosition, fallbackScale);
  const safeScale = clamp(base.scale || fallbackScale, MIN_OVERLAY_SCALE, MAX_OVERLAY_SCALE);
  const padding = Math.min(0.3, 0.08 + (safeScale - 1) * 0.05);

  return {
    x: clamp(base.x, padding, 1 - padding),
    y: clamp(base.y, padding, 1 - padding),
    scale: safeScale,
  };
};

const loadMediaElement = async <T extends HTMLMediaElement>(element: T, src: string) => {
  await new Promise<void>((resolve, reject) => {
    const onLoaded = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error('Impossible de charger le media.'));
    };

    const cleanup = () => {
      element.removeEventListener('loadedmetadata', onLoaded);
      element.removeEventListener('error', onError);
    };

    element.addEventListener('loadedmetadata', onLoaded);
    element.addEventListener('error', onError);
    element.src = src;
    element.load();
  });
};

const getSupportedRecorderMimeType = () => {
  if (typeof MediaRecorder === 'undefined') {
    return '';
  }

  const candidates = [
    'video/mp4;codecs=h264,aac',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || '';
};

const getCanvasCaptureStream = (canvas: HTMLCanvasElement, fps: number) => {
  const canvasWithFallback = canvas as HTMLCanvasElement & {
    mozCaptureStream?: (frameRate?: number) => MediaStream;
  };

  if (typeof canvasWithFallback.captureStream === 'function') {
    return canvasWithFallback.captureStream(fps);
  }

  if (typeof canvasWithFallback.mozCaptureStream === 'function') {
    return canvasWithFallback.mozCaptureStream(fps);
  }

  return null;
};

const getOutputExtension = (mimeType: string) => (mimeType.includes('mp4') ? 'mp4' : 'webm');

const drawSticker = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stickerEmoji?: string | null,
  stickerPosition: StickerPosition = 'bottom-right',
  stickerTransform?: OverlayTransform
) => {
  if (!stickerEmoji) {
    return;
  }

  const resolvedTransform = normalizeOverlayTransform(stickerTransform, stickerPosition, 1);
  const fontSize = Math.max(52, Math.round(width * 0.12 * resolvedTransform.scale));
  const anchorX = width * resolvedTransform.x;
  const anchorY = height * resolvedTransform.y;
  const y = anchorY + fontSize / 3;

  ctx.save();
  ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 18;
  ctx.fillText(stickerEmoji, anchorX, y);
  ctx.restore();
};

const drawTextOverlay = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  textOverlay?: string | null,
  textPosition: StickerPosition = 'center',
  textTransform?: OverlayTransform,
  textStyle?: TextOverlayStyle
) => {
  const trimmedText = textOverlay?.trim();
  if (!trimmedText) {
    return;
  }

  const resolvedTransform = normalizeOverlayTransform(textTransform, textPosition, 1);
  const fontSize = Math.max(26, Math.round(width * 0.06 * resolvedTransform.scale));
  const padding = Math.max(22, Math.round(width * 0.04));
  const maxWidth = Math.max(width * 0.72, width - padding * 2);
  const lineHeight = Math.round(fontSize * 1.18);
  const resolvedColor = textStyle?.color || '#ffffff';
  const resolvedFontFamily = textStyle?.fontFamily || 'Segoe UI';
  const resolvedFontWeight = textStyle?.fontWeight || 'bold';
  const resolvedFontStyle = textStyle?.fontStyle || 'normal';
  const resolvedTextDecoration = textStyle?.textDecoration || 'none';

  ctx.save();
  ctx.font = `${resolvedFontStyle} ${resolvedFontWeight} ${fontSize}px "${resolvedFontFamily}", sans-serif`;

  const lines: string[] = [];
  const paragraphs = trimmedText.split(/\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean);

  paragraphs.forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let currentLine = '';

    words.forEach((word) => {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(nextLine).width <= maxWidth || !currentLine) {
        currentLine = nextLine;
        return;
      }

      lines.push(currentLine);
      currentLine = word;
    });

    if (currentLine) {
      lines.push(currentLine);
    }
  });

  const visibleLines = lines.slice(0, 3);
  if (lines.length > 3) {
    const lastLine = visibleLines[2];
    visibleLines[2] = lastLine.length > 24 ? `${lastLine.slice(0, 21)}...` : `${lastLine}...`;
  }

  const anchorX = width * resolvedTransform.x;
  const anchorY = height * resolvedTransform.y;
  const blockHeight = visibleLines.length * lineHeight;
  const startY = anchorY - blockHeight / 2 + fontSize * 0.8;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = resolvedColor;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = Math.max(5, Math.round(fontSize * 0.16));
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 16;

  visibleLines.forEach((line, index) => {
    const y = startY + index * lineHeight;
    ctx.strokeText(line, anchorX, y);
    ctx.fillText(line, anchorX, y);

    if (resolvedTextDecoration === 'underline') {
      const metrics = ctx.measureText(line);
      const underlineY = y + Math.max(6, Math.round(fontSize * 0.1));
      const underlineHalfWidth = metrics.width / 2;

      ctx.beginPath();
      ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.08));
      ctx.strokeStyle = resolvedColor;
      ctx.shadowBlur = 0;
      ctx.moveTo(anchorX - underlineHalfWidth, underlineY);
      ctx.lineTo(anchorX + underlineHalfWidth, underlineY);
      ctx.stroke();
    }
  });

  ctx.restore();
};

const drawStickerSet = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stickerOverlays?: StickerOverlayItem[],
  stickerEmoji?: string | null,
  stickerPosition: StickerPosition = 'bottom-right',
  stickerTransform?: OverlayTransform
) => {
  if (stickerOverlays && stickerOverlays.length > 0) {
    stickerOverlays.forEach((overlay) => {
      drawSticker(ctx, width, height, overlay.emoji, 'center', overlay.transform);
    });
    return;
  }

  drawSticker(ctx, width, height, stickerEmoji, stickerPosition, stickerTransform);
};

const drawTextSet = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  textOverlays?: TextOverlayItem[],
  textOverlay?: string | null,
  textPosition: StickerPosition = 'center',
  textTransform?: OverlayTransform
) => {
  if (textOverlays && textOverlays.length > 0) {
    textOverlays.forEach((overlay) => {
      drawTextOverlay(ctx, width, height, overlay.text, 'center', overlay.transform, overlay.style);
    });
    return;
  }

  drawTextOverlay(ctx, width, height, textOverlay, textPosition, textTransform);
};

const seekVideo = async (video: HTMLVideoElement, time: number) => {
  await new Promise<void>((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error('Impossible de capturer cette frame video.'));
    };

    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    };

    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.currentTime = time;
  });
};

export const captureVideoThumbnail = async ({
  source,
  timeSeconds,
  timeRatio = 0.2,
  stickerEmoji,
  stickerPosition = 'bottom-right',
  stickerTransform,
  stickerOverlays,
  textOverlay,
  textPosition = 'center',
  textTransform,
  textOverlays,
}: ThumbnailOptions): Promise<File> => {
  const objectUrl = typeof source === 'string' ? source : URL.createObjectURL(source);
  const shouldRevoke = typeof source !== 'string';

  try {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    video.preload = 'auto';

    await loadMediaElement(video, objectUrl);

    const width = video.videoWidth;
    const height = video.videoHeight;
    const duration = Number.isFinite(video.duration) ? video.duration : 0;

    if (!width || !height) {
      throw new Error('Dimensions video invalides.');
    }

    const targetTime = typeof timeSeconds === 'number' && Number.isFinite(timeSeconds)
      ? Math.min(Math.max(timeSeconds, 0), Math.max(duration - 0.1, 0))
      : duration > 0
        ? Math.min(Math.max(duration * timeRatio, 0), Math.max(duration - 0.1, 0))
        : 0;
    await seekVideo(video, targetTime);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas indisponible.');
    }

    ctx.drawImage(video, 0, 0, width, height);
    drawStickerSet(ctx, width, height, stickerOverlays, stickerEmoji, stickerPosition, stickerTransform);
    drawTextSet(ctx, width, height, textOverlays, textOverlay, textPosition, textTransform);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) {
          resolve(value);
          return;
        }

        reject(new Error('Impossible de generer la miniature.'));
      }, 'image/jpeg', 0.92);
    });

    return new File([blob], `thumbnail_${Date.now()}.jpg`, { type: 'image/jpeg' });
  } finally {
    if (shouldRevoke) {
      URL.revokeObjectURL(objectUrl);
    }
  }
};

export const captureThumbnailFromVideoElement = async ({
  video,
  stickerEmoji,
  stickerPosition = 'bottom-right',
  stickerTransform,
  stickerOverlays,
  textOverlay,
  textPosition = 'center',
  textTransform,
  textOverlays,
}: VideoElementThumbnailOptions): Promise<File> => {
  const width = video.videoWidth;
  const height = video.videoHeight;

  if (!width || !height) {
    throw new Error('Dimensions video invalides.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas indisponible.');
  }

  ctx.drawImage(video, 0, 0, width, height);
  drawStickerSet(ctx, width, height, stickerOverlays, stickerEmoji, stickerPosition, stickerTransform);
  drawTextSet(ctx, width, height, textOverlays, textOverlay, textPosition, textTransform);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) {
        resolve(value);
        return;
      }

      reject(new Error('Impossible de generer la miniature.'));
    }, 'image/jpeg', 0.92);
  });

  return new File([blob], `thumbnail_${Date.now()}.jpg`, { type: 'image/jpeg' });
};

export const composeVideoForPublish = async ({
  videoFile,
  stickerEmoji,
  stickerPosition = 'bottom-right',
  stickerTransform,
  stickerOverlays,
  textOverlay,
  textPosition = 'center',
  textTransform,
  textOverlays,
  audioFile,
  onProgress,
}: ComposeVideoOptions): Promise<File> => {
  if (!stickerEmoji && !textOverlay && !(stickerOverlays?.length) && !(textOverlays?.length) && !audioFile) {
    return videoFile;
  }

  const mimeType = getSupportedRecorderMimeType();

  const videoUrl = URL.createObjectURL(videoFile);
  const audioUrl = audioFile ? URL.createObjectURL(audioFile) : null;

  let renderFrameHandle: number | null = null;
  let canvasStream: MediaStream | null = null;
  let combinedStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let audioElement: HTMLAudioElement | null = null;

  try {
    const video = document.createElement('video');
    video.playsInline = true;
    video.preload = 'auto';
    video.muted = false;

    await loadMediaElement(video, videoUrl);

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null;

    if (!sourceWidth || !sourceHeight) {
      return videoFile;
    }

    const outputWidth = Math.min(sourceWidth, MAX_COMPOSE_WIDTH);
    const outputHeight = Math.round((outputWidth / sourceWidth) * sourceHeight);

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx) {
      return videoFile;
    }

    canvasStream = getCanvasCaptureStream(canvas, TARGET_FPS);
    if (!canvasStream) {
      return videoFile;
    }

    const audioTracks: MediaStreamTrack[] = [];

    audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    const videoAudioSource = audioContext.createMediaElementSource(video);
    const videoGain = audioContext.createGain();
    videoGain.gain.value = 1;
    videoAudioSource.connect(videoGain);
    videoGain.connect(destination);

    if (audioUrl) {
      audioElement = document.createElement('audio');
      audioElement.preload = 'auto';
      audioElement.loop = true;
      await loadMediaElement(audioElement, audioUrl);

      const overlayAudioSource = audioContext.createMediaElementSource(audioElement);
      const overlayGain = audioContext.createGain();
      overlayGain.gain.value = 0.9;
      overlayAudioSource.connect(overlayGain);
      overlayGain.connect(destination);
    }

    await audioContext.resume();
    destination.stream.getAudioTracks().forEach((track) => audioTracks.push(track));

    combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ]);

    const chunks: Blob[] = [];

    const composedBlob = await new Promise<Blob>((resolve, reject) => {
      const recorder = mimeType
        ? new MediaRecorder(combinedStream as MediaStream, {
            mimeType,
            videoBitsPerSecond: DEFAULT_VIDEO_BITRATE,
          })
        : new MediaRecorder(combinedStream as MediaStream, {
            videoBitsPerSecond: DEFAULT_VIDEO_BITRATE,
          });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onerror = () => reject(new Error('Echec de la composition video.'));
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));

      const fpsInterval = 1000 / TARGET_FPS;
      let previousFrameAt = 0;

      const render = (timestamp: number) => {
        if (video.ended || video.paused) {
          if (video.ended && recorder.state === 'recording') {
            recorder.stop();
          }
          return;
        }

        if (timestamp - previousFrameAt < fpsInterval) {
          renderFrameHandle = requestAnimationFrame(render);
          return;
        }

        previousFrameAt = timestamp;
        ctx.drawImage(video, 0, 0, outputWidth, outputHeight);
        drawStickerSet(ctx, outputWidth, outputHeight, stickerOverlays, stickerEmoji, stickerPosition, stickerTransform);
        drawTextSet(ctx, outputWidth, outputHeight, textOverlays, textOverlay, textPosition, textTransform);

        if (duration && duration > 0) {
          onProgress?.(Math.min(95, Math.round((video.currentTime / duration) * 100)));
        }

        renderFrameHandle = requestAnimationFrame(render);
      };

      recorder.start(250);
      video.currentTime = 0;
      if (audioElement) {
        audioElement.currentTime = 0;
      }
      video.play().then(() => {
        if (audioElement) {
          void audioElement.play().catch(() => {
            // Ignore: la piste ajoutee est optionnelle pour la composition finale.
          });
        }
        renderFrameHandle = requestAnimationFrame(render);
      }).catch(reject);
    });

    onProgress?.(100);

    return new File([composedBlob], `video_${Date.now()}.${getOutputExtension(mimeType)}`, {
      type: mimeType,
    });
  } finally {
    if (renderFrameHandle !== null) {
      cancelAnimationFrame(renderFrameHandle);
    }

    canvasStream?.getTracks().forEach((track) => track.stop());
    combinedStream?.getTracks().forEach((track) => track.stop());
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
    if (audioContext) {
      void audioContext.close();
    }

    URL.revokeObjectURL(videoUrl);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  }
};