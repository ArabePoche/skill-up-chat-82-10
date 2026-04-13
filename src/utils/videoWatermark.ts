/**
 * Compatibilité rétroactive pour les anciens imports du module watermark.
 * La logique active a été déplacée vers `@/watermark`.
 */

export { downloadVideoWithWatermark } from '@/watermark';
export type { WatermarkOptions as DownloadOptions } from '@/watermark';
