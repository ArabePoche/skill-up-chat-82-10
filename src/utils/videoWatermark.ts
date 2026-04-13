/**
 * Compatibilité rétroactive pour les anciens imports du module watermark.
 * La logique active a été déplacée vers `@/watermark`.
 *
 * @deprecated Import directly from `@/watermark` instead.
 */

export { downloadVideoWithWatermark } from '@/watermark';
export type { WatermarkOptions as DownloadOptions } from '@/watermark';
