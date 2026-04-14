import { supabase } from '@/integrations/supabase/client';

export async function requestServerWatermarkVideo(options: {
  videoUrl: string;
  authorName: string;
  watermarkText?: string;
  outputFormat?: 'mp4' | 'webm';
}): Promise<Blob> {
  const { videoUrl, authorName, watermarkText = 'REZO', outputFormat = 'mp4' } = options;

  const { data, error } = await supabase.functions.invoke('watermark-video', {
    body: { videoUrl, authorName, watermarkText, outputFormat },
    // Tell the client we expect a binary file back
    // (This works in modern @supabase/supabase-js)
  });

  if (error) {
    throw new Error(`Watermark API error: ${error.message}`);
  }

  // If data is somehow an ArrayBuffer, convert to Blob, otherwise return directly
  return data instanceof Blob ? data : new Blob([data as ArrayBuffer], { type: 'video/mp4' });
}
