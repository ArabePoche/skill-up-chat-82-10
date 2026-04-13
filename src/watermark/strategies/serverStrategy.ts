/**
 * Stratégie serveur : file un job de watermark sécurisé, poll son état,
 * puis télécharge le rendu final signé.
 */

import { supabase } from '@/integrations/supabase/client';
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

async function createServerJob(options: WatermarkOptions) {
  const { data, error } = await supabase.functions.invoke('watermark-video', {
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
  const { data, error } = await supabase.functions.invoke('watermark-video', {
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

async function downloadRenderedVideo(status: JobStatusResponse): Promise<Blob> {
  const mimeType = status.outputMimeType || 'video/mp4';

  if (status.outputBucket && status.outputPath) {
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
