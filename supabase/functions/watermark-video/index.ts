import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WATERMARK_EXPORT_BUCKET = "watermark-exports";
const OUTPUT_MIME_TYPE = "video/mp4";
const MAX_SOURCE_SIZE_BYTES = 250 * 1024 * 1024;
const MAX_DURATION_SECONDS = 10 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 60 * 10;
const JOB_RETENTION_HOURS = 24;

type WatermarkJobStatus = "queued" | "processing" | "completed" | "failed" | "expired";

type WatermarkJobRow = {
  id: string;
  requested_by: string;
  status: WatermarkJobStatus;
  stage: string;
  progress: number;
  source_url: string;
  source_host: string;
  author_name: string;
  watermark_text: string;
  file_name: string;
  output_bucket: string;
  output_path: string | null;
  output_mime_type: string;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  attempts: number;
  expires_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
};

type MediaProbe = {
  format?: {
    duration?: string;
    size?: string;
    format_name?: string;
  };
  streams?: Array<{
    codec_type?: string;
    codec_name?: string;
    width?: number;
    height?: number;
    duration?: string;
  }>;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeFileName(fileName: string): string {
  const sanitized = fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");

  const safeBase = sanitized.replace(/\.[^.]+$/, "") || `video_${Date.now()}`;
  return `${safeBase}.mp4`;
}

function escapeForFfmpeg(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/,/g, "\\,")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function buildWatermarkFilter(authorName: string, watermarkText: string) {
  const text = escapeForFfmpeg(watermarkText);
  const author = escapeForFfmpeg(authorName);
  return [
    "scale='min(1280,iw)':-2",
    `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${text}':fontsize=26:fontcolor=white@0.85:x=w-tw-20:y=h-th-20:box=1:boxcolor=black@0.4:boxborderw=8`,
    `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='@${author}':fontsize=20:fontcolor=white@0.7:x=w-tw-20:y=h-th-60:box=1:boxcolor=black@0.4:boxborderw=8`,
  ].join(",");
}

function getAllowedHosts() {
  const configuredHosts = (Deno.env.get("WATERMARK_ALLOWED_HOSTS") || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  const projectHost = (() => {
    try {
      return new URL(Deno.env.get("SUPABASE_URL") || "").hostname.toLowerCase();
    } catch {
      return "";
    }
  })();

  const wildcardHosts = configuredHosts.filter((host) => host.startsWith("*."));
  const exactHosts = new Set(
    [projectHost, ...configuredHosts.filter((host) => !host.startsWith("*."))].filter(Boolean),
  );

  return { exactHosts, wildcardHosts };
}

function isHostAllowed(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  const { exactHosts, wildcardHosts } = getAllowedHosts();
  if (exactHosts.size === 0 && wildcardHosts.length === 0) {
    return true;
  }
  if (exactHosts.has(normalizedHost)) {
    return true;
  }

  return wildcardHosts.some((host) => {
    const suffix = host.slice(1).toLowerCase();
    return normalizedHost.endsWith(suffix);
  });
}

function validateSourceUrl(videoUrl: string): URL {
  let parsed: URL;

  try {
    parsed = new URL(videoUrl);
  } catch {
    throw new Error("URL vidéo invalide");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Seules les URLs HTTPS sont autorisées");
  }

  if (!isHostAllowed(parsed.hostname)) {
    throw new Error("La source vidéo n'est pas autorisée pour le watermark sécurisé");
  }

  return parsed;
}

async function cleanTemp(...paths: Array<string | null | undefined>) {
  for (const path of paths) {
    if (!path) continue;
    try {
      await Deno.remove(path);
    } catch {
      // Ignore cleanup errors.
    }
  }
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(label: string, operation: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        throw error;
      }
      console.warn(`[watermark-video] ${label} failed (attempt ${attempt}/${attempts})`, error);
      await sleep(attempt * 500);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${label} failed`);
}

async function downloadSourceToTempFile(url: string, filePath: string) {
  await withRetry("download-source", async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Téléchargement source impossible (${response.status})`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType && !contentType.toLowerCase().startsWith("video/")) {
      throw new Error("Le fichier source doit être une vidéo");
    }

    const declaredSize = Number(response.headers.get("content-length") || "0");
    if (declaredSize > MAX_SOURCE_SIZE_BYTES) {
      throw new Error("La vidéo source dépasse la taille maximale autorisée");
    }

    const file = await Deno.open(filePath, { create: true, write: true, truncate: true });

    try {
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Le flux vidéo source est indisponible");
      }

      let loaded = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        loaded += value.byteLength;
        if (loaded > MAX_SOURCE_SIZE_BYTES) {
          throw new Error("La vidéo source dépasse la taille maximale autorisée");
        }
        await file.write(value);
      }
    } finally {
      file.close();
    }
  });
}

async function probeMedia(filePath: string): Promise<MediaProbe> {
  const probe = await new Deno.Command("ffprobe", {
    args: [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath,
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();

  if (!probe.success) {
    const stderr = new TextDecoder().decode(probe.stderr);
    throw new Error(`ffprobe failed: ${stderr || "unknown error"}`);
  }

  const raw = new TextDecoder().decode(probe.stdout);
  return JSON.parse(raw) as MediaProbe;
}

function validateSourceProbe(probe: MediaProbe) {
  const duration = Number(probe.format?.duration || "0");
  const videoStream = probe.streams?.find((stream) => stream.codec_type === "video");

  if (!videoStream) {
    throw new Error("La source ne contient pas de piste vidéo valide");
  }

  if (!duration || !Number.isFinite(duration)) {
    throw new Error("La durée de la vidéo source est invalide");
  }

  if (duration > MAX_DURATION_SECONDS) {
    throw new Error("La durée de la vidéo dépasse la limite autorisée");
  }

  return {
    duration,
    hasAudio: Boolean(probe.streams?.some((stream) => stream.codec_type === "audio")),
    width: Number(videoStream.width || 0),
    height: Number(videoStream.height || 0),
  };
}

function validateOutputProbe(probe: MediaProbe, sourceDuration: number, sourceHasAudio: boolean) {
  const duration = Number(probe.format?.duration || "0");
  const hasVideo = Boolean(probe.streams?.some((stream) => stream.codec_type === "video"));
  const hasAudio = Boolean(probe.streams?.some((stream) => stream.codec_type === "audio"));

  if (!hasVideo) {
    throw new Error("Le rendu final ne contient pas de piste vidéo");
  }

  if (sourceHasAudio && !hasAudio) {
    throw new Error("Le rendu final a perdu la piste audio");
  }

  if (!duration || Math.abs(duration - sourceDuration) > 2) {
    throw new Error("Le rendu final ne respecte pas la durée attendue");
  }

  return {
    duration,
    hasAudio,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

async function updateJob(
  admin: AdminClient,
  jobId: string,
  patch: Partial<WatermarkJobRow> & { metadata?: Record<string, unknown> },
) {
  const { error } = await admin
    .from("video_watermark_jobs")
    .update(patch as Record<string, unknown>)
    .eq("id", jobId);

  if (error) {
    throw new Error(`Job update failed: ${error.message}`);
  }
}

async function markJobFailed(
  admin: AdminClient,
  jobId: string,
  errorMessage: string,
) {
  const { error } = await admin
    .from("video_watermark_jobs")
    .update({
      status: "failed",
      stage: "Traitement échoué",
      progress: 100,
      error_message: errorMessage,
      failed_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq("id", jobId);

  if (error) {
    console.error("[watermark-video] failed to mark job as failed", { jobId, error });
  }
}

async function runFfmpeg(inputPath: string, outputPath: string, authorName: string, watermarkText: string) {
  const filter = buildWatermarkFilter(authorName, watermarkText);
  const command = new Deno.Command("ffmpeg", {
    args: [
      "-y",
      "-i",
      inputPath,
      "-vf",
      filter,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "24",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outputPath,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const output = await command.output();
  if (!output.success) {
    const stderr = new TextDecoder().decode(output.stderr);
    throw new Error(`FFmpeg a échoué: ${stderr || "unknown error"}`);
  }
}

async function processWatermarkJob(supabaseUrl: string, serviceKey: string, jobId: string) {
  const admin = createClient(supabaseUrl, serviceKey);
  let inputPath: string | null = null;
  let outputPath: string | null = null;

  try {
    const { data: job, error: fetchError } = await admin
      .from("video_watermark_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle<WatermarkJobRow>();

    if (fetchError || !job) {
      throw new Error(fetchError?.message || "Job introuvable");
    }

    const uid = crypto.randomUUID();
    inputPath = `/tmp/vw-input-${uid}.mp4`;
    outputPath = `/tmp/vw-output-${uid}.mp4`;

    await updateJob(admin, jobId, {
      status: "processing",
      stage: "Validation de la source",
      progress: 10,
      started_at: new Date().toISOString(),
      attempts: job.attempts + 1,
      error_message: null,
      failed_at: null,
    });

    await downloadSourceToTempFile(job.source_url, inputPath);

    const sourceProbe = await probeMedia(inputPath);
    const sourceValidation = validateSourceProbe(sourceProbe);

    await updateJob(admin, jobId, {
      stage: "Application du watermark",
      progress: 45,
      metadata: {
        sourceDurationSeconds: sourceValidation.duration,
        sourceHasAudio: sourceValidation.hasAudio,
        sourceWidth: sourceValidation.width,
        sourceHeight: sourceValidation.height,
      },
    });

    await runFfmpeg(inputPath, outputPath, job.author_name, job.watermark_text);

    const outputProbe = await probeMedia(outputPath);
    const outputValidation = validateOutputProbe(
      outputProbe,
      sourceValidation.duration,
      sourceValidation.hasAudio,
    );

    await updateJob(admin, jobId, {
      stage: "Upload de l'export sécurisé",
      progress: 85,
      metadata: {
        sourceDurationSeconds: sourceValidation.duration,
        sourceHasAudio: sourceValidation.hasAudio,
        sourceWidth: sourceValidation.width,
        sourceHeight: sourceValidation.height,
        outputDurationSeconds: outputValidation.duration,
        outputHasAudio: outputValidation.hasAudio,
      },
    });

    const outputData = await Deno.readFile(outputPath);
    const storagePath = `${job.requested_by}/${jobId}/${sanitizeFileName(job.file_name)}`;

    await withRetry("upload-output", async () => {
      const { error } = await admin.storage
        .from(WATERMARK_EXPORT_BUCKET)
        .upload(storagePath, outputData, {
          contentType: OUTPUT_MIME_TYPE,
          upsert: true,
        });

      if (error) {
        throw new Error(error.message);
      }
    });

    await updateJob(admin, jobId, {
      status: "completed",
      stage: "Export prêt au téléchargement",
      progress: 100,
      output_path: storagePath,
      output_bucket: WATERMARK_EXPORT_BUCKET,
      output_mime_type: OUTPUT_MIME_TYPE,
      completed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + JOB_RETENTION_HOURS * 60 * 60 * 1000).toISOString(),
      metadata: {
        sourceDurationSeconds: sourceValidation.duration,
        sourceHasAudio: sourceValidation.hasAudio,
        sourceWidth: sourceValidation.width,
        sourceHeight: sourceValidation.height,
        outputDurationSeconds: outputValidation.duration,
        outputHasAudio: outputValidation.hasAudio,
        outputSizeBytes: outputData.byteLength,
      },
    });

    console.log("[watermark-video] job completed", { jobId, storagePath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[watermark-video] job failed", { jobId, message, error });
    await markJobFailed(admin, jobId, message);
  } finally {
    await cleanTemp(inputPath, outputPath);
  }
}

async function authenticateUser(req: Request, supabaseUrl: string, anonKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { user: null, error: jsonResponse({ success: false, message: "Non authentifié" }, 401) };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: { user }, error } = await userClient.auth.getUser(token);
  if (error || !user) {
    return { user: null, error: jsonResponse({ success: false, message: "Non authentifié" }, 401) };
  }

  return { user, error: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, message: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const auth = await authenticateUser(req, supabaseUrl, anonKey);
    if (auth.error || !auth.user) {
      return auth.error!;
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const action = body?.action === "status" ? "status" : "create";

    if (action === "status") {
      const jobId = String(body?.jobId || "").trim();
      if (!jobId) {
        return jsonResponse({ success: false, message: "jobId requis" }, 400);
      }

      const { data: job, error } = await admin
        .from("video_watermark_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("requested_by", auth.user.id)
        .maybeSingle<WatermarkJobRow>();

      if (error || !job) {
        return jsonResponse({ success: false, message: "Job introuvable" }, 404);
      }

      if (job.status === "completed" && job.expires_at && new Date(job.expires_at).getTime() <= Date.now()) {
        return jsonResponse({
          success: true,
          jobId: job.id,
          status: "expired",
          stage: "Export expiré",
          progress: 100,
          errorMessage: "L'export a expiré. Relancez le téléchargement pour générer une nouvelle version.",
        });
      }

      let downloadUrl: string | null = null;
      if (job.status === "completed" && job.output_path) {
        const { data: signed, error: signedError } = await admin.storage
          .from(job.output_bucket)
          .createSignedUrl(job.output_path, DOWNLOAD_URL_TTL_SECONDS, {
            download: sanitizeFileName(job.file_name),
          });

        if (signedError) {
          console.error("[watermark-video] signed url error", { jobId, signedError });
        } else {
          downloadUrl = signed.signedUrl;
        }
      }

      return jsonResponse({
        success: true,
        jobId: job.id,
        status: job.status,
        stage: job.stage,
        progress: job.progress,
        fileName: sanitizeFileName(job.file_name),
        outputBucket: job.output_bucket,
        outputPath: job.output_path,
        outputMimeType: job.output_mime_type,
        downloadUrl,
        errorMessage: job.error_message,
      });
    }

    const videoUrl = String(body?.videoUrl || "").trim();
    const authorName = String(body?.authorName || "REZO").trim().slice(0, 80);
    const watermarkText = String(body?.watermarkText || "REZO").trim().slice(0, 80);
    const fileName = sanitizeFileName(String(body?.fileName || "video-watermark.mp4"));

    if (!videoUrl) {
      return jsonResponse({ success: false, message: "videoUrl requis" }, 400);
    }

    const validatedUrl = validateSourceUrl(videoUrl);

    const { data: job, error } = await admin
      .from("video_watermark_jobs")
      .insert({
        requested_by: auth.user.id,
        source_url: validatedUrl.toString(),
        source_host: validatedUrl.hostname,
        author_name: authorName || "REZO",
        watermark_text: watermarkText || "REZO",
        file_name: fileName,
        output_bucket: WATERMARK_EXPORT_BUCKET,
        output_mime_type: OUTPUT_MIME_TYPE,
        status: "queued",
        stage: "Job mis en file d'attente",
        progress: 0,
      })
      .select("*")
      .maybeSingle<WatermarkJobRow>();

    if (error || !job) {
      return jsonResponse({
        success: false,
        message: error?.message || "Impossible de créer le job de watermark",
      }, 500);
    }

    const runtime = (globalThis as typeof globalThis & {
      EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
    }).EdgeRuntime;
    const backgroundWork = processWatermarkJob(supabaseUrl, serviceKey, job.id);

    if (runtime?.waitUntil) {
      runtime.waitUntil(backgroundWork);
    } else {
      void backgroundWork;
    }

    return jsonResponse({
      success: true,
      jobId: job.id,
      status: job.status,
      stage: job.stage,
      progress: job.progress,
      fileName,
      outputMimeType: OUTPUT_MIME_TYPE,
    }, 202);
  } catch (error) {
    console.error("[watermark-video] error", error);
    return jsonResponse({
      success: false,
      message: error instanceof Error ? error.message : "Erreur interne",
    }, 500);
  }
});
