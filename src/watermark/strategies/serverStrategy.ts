/**
 * Stratégie serveur : file un job de watermark sécurisé, poll son état,
 * puis télécharge le rendu final signé.
 */

import { supabase } from '@/integrations/supabase/client';
import { authStore } from '@/offline/utils/authStore';
import { WatermarkOptions, WATERMARK_CONSTANTS } from '../types';

type CreateJobResponse = {
  success: boolean;
  jobId?: string;
  stage?: string;
  progress?: number;
  message?: string;
};

type JobStatusResponse = {
  success: boolean;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'expired';
  stage?: string;
  progress?: number;
  downloadUrl?: string | null;
  outputBucket?: string | null;
  outputPath?: string | null;
  outputMimeType?: string;
  errorMessage?: string | null;
  message?: string;
};

async function wait(delayMs: number) {
  await new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

async function getWatermarkAuthHeaders() {
  let {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Session utilisateur introuvable: ${error.message}`);
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

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function createServerJob(options: WatermarkOptions) {
  const headers = await getWatermarkAuthHeaders();
  const { data, error } = await supabase.functions.invoke('watermark-video', {
    headers,
    body: {
      action: 'create',
      videoUrl: options.videoUrl,
      authorName: options.authorName,
      watermarkText: options.watermarkText,
      fileName: options.fileName,
    },
  });

  if (error) {
    throw new Error(`Watermark serveur: ${error.message}`);
  }

  const response = (data || {}) as CreateJobResponse;
  if (!response.success || !response.jobId) {
    throw new Error(response.message || 'Impossible de créer le job de watermark');
  }

  return response;
}

async function getServerJobStatus(jobId: string) {
  const headers = await getWatermarkAuthHeaders();
  const { data, error } = await supabase.functions.invoke('watermark-video', {
    headers,
    body: {
      action: 'status',
      jobId,
    },
  });

  if (error) {
    throw new Error(`Suivi watermark serveur: ${error.message}`);
  }

  const response = (data || {}) as JobStatusResponse;
  if (!response.success) {
    throw new Error(response.message || 'Impossible de suivre le job de watermark');
  }

  return response;
}

type CapacitorWindow = Window & {
  Capacitor?: { isNativePlatform?: () => boolean };
};

function isNative(): boolean {
  const w = window as CapacitorWindow;
  return typeof w.Capacitor?.isNativePlatform === 'function' && w.Capacitor.isNativePlatform();
}

async function downloadRenderedVideo(status: JobStatusResponse): Promise<Blob> {
  const mimeType = status.outputMimeType || 'video/mp4';

  // Sur plateforme native (Android/iOS), on privilégie le fetch direct via l'URL
  // signée : le SDK supabase.storage.download peut être instable sur les gros
  // fichiers vidéo à cause de son buffering interne. Le fetch natif WebView gère
  // mieux les vidéos volumineuses.
  if (!isNative() && status.outputBucket && status.outputPath) {
    const { data, error } = await supabase.storage
      .from(status.outputBucket)
      .download(status.outputPath);

    if (!error && data) {
      return data.type ? data : new Blob([data], { type: mimeType });
    }

    console.warn('⚠️ Watermark download via storage.download failed', {
      error,
      outputBucket: status.outputBucket,
      outputPath: status.outputPath,
    });
  }

  if (!status.downloadUrl) {
    throw new Error('Le rendu final est prêt mais le lien de téléchargement est indisponible');
  }

  const response = await fetch(status.downloadUrl);
  if (!response.ok) {
    throw new Error(`Téléchargement final impossible (${response.status})`);
  }

  const blob = await response.blob();
  return blob.type ? blob : new Blob([blob], { type: mimeType });
}

export async function processOnServer(options: WatermarkOptions): Promise<Blob> {
  const { onProgress, onStageChange } = options;

  onStageChange?.('Mise en file du traitement sécurisé...');
  onProgress?.(5);

  const job = await createServerJob(options);
  onStageChange?.(job.stage || 'Traitement sécurisé en attente...');
  onProgress?.(Math.max(5, Math.min(job.progress || 10, 90)));

  const startedAt = Date.now();

  while (Date.now() - startedAt < WATERMARK_CONSTANTS.SERVER_TIMEOUT_MS) {
    await wait(WATERMARK_CONSTANTS.SERVER_POLL_INTERVAL_MS);

    const status = await getServerJobStatus(job.jobId!);
    if (status.stage) {
      onStageChange?.(status.stage);
    }
    if (typeof status.progress === 'number') {
      onProgress?.(Math.max(5, Math.min(status.progress, 95)));
    }

    if (status.status === 'completed') {
      onStageChange?.('Téléchargement de la vidéo sécurisée...');
      onProgress?.(96);

      const blob = await downloadRenderedVideo(status);
      onProgress?.(100);
      return blob;
    }

    if (status.status === 'failed' || status.status === 'expired') {
      throw new Error(
        status.errorMessage ||
          (status.status === 'expired'
            ? 'L’export a expiré. Relancez le téléchargement.'
            : 'Le traitement serveur a échoué')
      );
    }
  }

  throw new Error('Le traitement serveur a dépassé le délai autorisé');
}
