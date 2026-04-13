/**
 * Stratégie serveur : délègue le watermark à la Edge Function Supabase (FFmpeg).
 * Utile quand le client ne supporte pas MediaRecorder (mobile Capacitor).
 */

import { WatermarkOptions } from '../types';
import { supabase } from '@/integrations/supabase/client';

export async function processOnServer(options: WatermarkOptions): Promise<Blob> {
  const { videoUrl, watermarkText, authorName, onProgress, onStageChange } = options;

  onStageChange?.('Envoi au serveur...');
  onProgress?.(10);

  const { data, error } = await supabase.functions.invoke('watermark-video', {
    body: {
      videoUrl,
      authorName,
      watermarkText,
      outputFormat: 'mp4',
    },
  });

  if (error) {
    throw new Error(`Watermark serveur: ${error.message}`);
  }

  onProgress?.(90);
  onStageChange?.('Réception de la vidéo...');

  return data instanceof Blob
    ? data
    : new Blob([data as ArrayBuffer], { type: 'video/mp4' });
}
