export type StickerPosition = 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right';

interface ComposeVideoOptions {
  videoFile: File;
  stickerEmoji?: string | null;
  stickerPosition?: StickerPosition;
  textOverlay?: string | null;
  textPosition?: StickerPosition;
  audioFile?: File | null;
  onProgress?: (progress: number) => void;
}

interface ThumbnailOptions {
  source: File | string;
  timeSeconds?: number;
  timeRatio?: number;
  stickerEmoji?: string | null;
  stickerPosition?: StickerPosition;
  textOverlay?: string | null;
  textPosition?: StickerPosition;
}

interface VideoElementThumbnailOptions {
  video: HTMLVideoElement;
  stickerEmoji?: string | null;
  stickerPosition?: StickerPosition;
  textOverlay?: string | null;
  textPosition?: StickerPosition;
}

const MAX_COMPOSE_WIDTH = 720;
const TARGET_FPS = 24;
const DEFAULT_VIDEO_BITRATE = 1_800_000;

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

const getOutputExtension = (mimeType: string) => (mimeType.includes('mp4') ? 'mp4' : 'webm');

const getOverlayAnchor = (width: number, height: number, position: StickerPosition, padding: number) => {
  const horizontal = position.endsWith('left') ? padding : position.endsWith('right') ? width - padding : width / 2;
  const vertical = position.startsWith('top') ? padding : position.startsWith('bottom') ? height - padding : height / 2;
  const align: CanvasTextAlign = position.endsWith('left') ? 'left' : position.endsWith('right') ? 'right' : 'center';

  return {
    x: horizontal,
    y: vertical,
    align,
  };
};

const drawSticker = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stickerEmoji?: string | null,
  stickerPosition: StickerPosition = 'bottom-right'
) => {
  if (!stickerEmoji) {
    return;
  }

  const fontSize = Math.max(52, Math.round(width * 0.12));
  const padding = Math.max(24, Math.round(width * 0.04));
  const anchor = getOverlayAnchor(width, height, stickerPosition, padding);
  const y = stickerPosition.startsWith('top')
    ? anchor.y + fontSize
    : stickerPosition === 'center'
      ? anchor.y + fontSize / 3
      : anchor.y;

  ctx.save();
  ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = anchor.align;
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 18;
  ctx.fillText(stickerEmoji, anchor.x, y);
  ctx.restore();
};

const drawTextOverlay = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  textOverlay?: string | null,
  textPosition: StickerPosition = 'center'
) => {
  const trimmedText = textOverlay?.trim();
  if (!trimmedText) {
    return;
  }

  const fontSize = Math.max(26, Math.round(width * 0.06));
  const padding = Math.max(22, Math.round(width * 0.04));
  const maxWidth = Math.max(width * 0.72, width - padding * 2);
  const lineHeight = Math.round(fontSize * 1.18);

  ctx.save();
  ctx.font = `700 ${fontSize}px "Segoe UI", sans-serif`;

  const words = trimmedText.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
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

  const visibleLines = lines.slice(0, 3);
  if (lines.length > 3) {
    const lastLine = visibleLines[2];
    visibleLines[2] = lastLine.length > 24 ? `${lastLine.slice(0, 21)}...` : `${lastLine}...`;
  }

  const anchor = getOverlayAnchor(width, height, textPosition, padding);
  const blockHeight = visibleLines.length * lineHeight;
  const startY = textPosition.startsWith('top')
    ? anchor.y + fontSize
    : textPosition.startsWith('bottom')
      ? anchor.y - blockHeight + fontSize * 0.9
      : anchor.y - blockHeight / 2 + fontSize * 0.8;

  ctx.textAlign = anchor.align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = Math.max(5, Math.round(fontSize * 0.16));
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 16;

  visibleLines.forEach((line, index) => {
    const y = startY + index * lineHeight;
    ctx.strokeText(line, anchor.x, y);
    ctx.fillText(line, anchor.x, y);
  });

  ctx.restore();
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
  textOverlay,
  textPosition = 'center',
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
    drawSticker(ctx, width, height, stickerEmoji, stickerPosition);
    drawTextOverlay(ctx, width, height, textOverlay, textPosition);

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
  textOverlay,
  textPosition = 'center',
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
  drawSticker(ctx, width, height, stickerEmoji, stickerPosition);
  drawTextOverlay(ctx, width, height, textOverlay, textPosition);

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
  textOverlay,
  textPosition = 'center',
  audioFile,
  onProgress,
}: ComposeVideoOptions): Promise<File> => {
  if (!stickerEmoji && !textOverlay && !audioFile) {
    return videoFile;
  }

  const mimeType = getSupportedRecorderMimeType();
  if (!mimeType) {
    return videoFile;
  }

  const videoUrl = URL.createObjectURL(videoFile);
  const audioUrl = audioFile ? URL.createObjectURL(audioFile) : null;

  let renderFrameHandle: number | null = null;
  let canvasStream: MediaStream | null = null;
  let combinedStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;

  try {
    const video = document.createElement('video');
    video.playsInline = true;
    video.preload = 'auto';
    video.muted = false;

    await loadMediaElement(video, videoUrl);

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    const duration = Number.isFinite(video.duration) ? video.duration : 0;

    if (!sourceWidth || !sourceHeight || !duration) {
      return videoFile;
    }

    const outputWidth = Math.min(sourceWidth, MAX_COMPOSE_WIDTH);
    const outputHeight = Math.round((outputWidth / sourceWidth) * sourceHeight);

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx || typeof canvas.captureStream !== 'function') {
      return videoFile;
    }

    canvasStream = canvas.captureStream(TARGET_FPS);

    const audioTracks: MediaStreamTrack[] = [];

    if (audioUrl) {
      const audio = document.createElement('audio');
      audio.preload = 'auto';
      audio.loop = true;
      await loadMediaElement(audio, audioUrl);

      audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(audio);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      source.connect(audioContext.destination);
      await audioContext.resume();

      destination.stream.getAudioTracks().forEach((track) => audioTracks.push(track));
      await audio.play();
    } else {
      try {
        const capturedStream = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
        capturedStream?.getAudioTracks().forEach((track) => audioTracks.push(track));
      } catch {
        // Ignore: on garde une video sans piste audio supplementaire.
      }
    }

    combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ]);

    const chunks: Blob[] = [];

    const composedBlob = await new Promise<Blob>((resolve, reject) => {
      const recorder = new MediaRecorder(combinedStream as MediaStream, {
        mimeType,
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
        drawSticker(ctx, outputWidth, outputHeight, stickerEmoji, stickerPosition);
        drawTextOverlay(ctx, outputWidth, outputHeight, textOverlay, textPosition);

        if (duration > 0) {
          onProgress?.(Math.min(95, Math.round((video.currentTime / duration) * 100)));
        }

        renderFrameHandle = requestAnimationFrame(render);
      };

      recorder.start(250);
      video.currentTime = 0;
      video.play().then(() => {
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
    if (audioContext) {
      void audioContext.close();
    }

    URL.revokeObjectURL(videoUrl);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  }
};