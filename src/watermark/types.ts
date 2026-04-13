/**
 * Types partagés pour le système de watermark vidéo.
 */

export interface WatermarkOptions {
  videoUrl: string;
  watermarkText: string;
  authorName: string;
  fileName: string;
  onProgress?: (percent: number) => void;
  onStageChange?: (stage: string) => void;
}

export interface WatermarkRendererOptions {
  text: string;
  authorName: string;
  logoImage: HTMLImageElement | null;
}

export interface WatermarkStrategy {
  /** Applique le watermark et retourne le blob résultant */
  process(options: WatermarkOptions): Promise<Blob>;
}

export const WATERMARK_CONSTANTS = {
  FETCH_PROGRESS_MAX: 40,
  RENDER_START: 45,
  RENDER_END: 90,
  SAVE_PROGRESS: 95,
  SWITCH_INTERVAL: 8,
  MAX_VIDEO_WIDTH: 720,
  TARGET_FPS: 24,
  DEFAULT_VIDEO_BITRATE: 1_500_000,
} as const;
