import { supabase } from '@/integrations/supabase/client';
import { authStore } from '@/offline/utils/authStore';

export async function requestServerWatermarkVideo(options: {
  videoUrl: string;
  authorName: string;
  watermarkText?: string;
  outputFormat?: 'mp4' | 'webm';
}): Promise<Blob> {
  const { videoUrl, authorName, watermarkText = 'REZO', outputFormat = 'mp4' } = options;

  let {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(`Session utilisateur introuvable: ${sessionError.message}`);
  }

  if (!session?.access_token) {
    const cached = await authStore.getCachedSession();
    const cachedSession = cached?.session;

    if (cachedSession?.access_token && cachedSession?.refresh_token) {
      const { data, error: restoreError } = await supabase.auth.setSession({
        access_token: cachedSession.access_token,
        refresh_token: cachedSession.refresh_token,
      });

      if (restoreError) {
        throw new Error(`Session utilisateur introuvable: ${restoreError.message}`);
      }

      session = data.session;
    }
  }

  if (!session?.access_token) {
    throw new Error('Connexion requise pour télécharger une vidéo avec watermark');
  }

  const { data, error } = await supabase.functions.invoke('watermark-video', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
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
