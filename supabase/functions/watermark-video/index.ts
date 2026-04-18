import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WATERMARK_EXPORT_BUCKET = "videos-watermark-temp";
const OUTPUT_MIME_TYPE = "video/mp4";
const MAX_SOURCE_SIZE_BYTES = 250 * 1024 * 1024;
const MAX_DURATION_SECONDS = 10 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 60 * 10;
const JOB_RETENTION_HOURS = 24;
const WATERMARK_MARGIN_PX = 24;

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

type PlatformSettingRow = {
  value: string;
};

type ProbeStream = {
  codec_type?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  codec_name?: string;
};

type ProbeFormat = {
  duration?: string;
};

type ProbeResult = {
  streams?: ProbeStream[];
  format?: ProbeFormat;
};

type MediaMetadata = {
  width: number;
  height: number;
  durationSeconds: number | null;
  frameRate: string | null;
  hasAudio: boolean;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function escapeDrawtextValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\\\'")
    .replace(/,/g, "\\,")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/%/g, "\\%");
}

function normalizeHandle(authorName: string): string {
  const normalized = authorName.trim().replace(/^@+/, "") || "REZO";
  return `@${normalized}`;
}

function getWatermarkLabel(platformName: string, authorName: string): string {
  const platform = platformName.trim() || "REZO";
  return `${platform} ${normalizeHandle(authorName)}`.trim();
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

  return wildcardHosts.some((host) => normalizedHost.endsWith(host.slice(1).toLowerCase()));
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

async function validateSourceHttp(url: string): Promise<void> {
  let response: Response;

  try {
    response = await fetch(url, { method: "HEAD" });
  } catch {
    throw new Error("La source vidéo est inaccessible");
  }

  if (!response.ok && response.status !== 405) {
    throw new Error(`Source vidéo inaccessible (${response.status})`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType && !contentType.toLowerCase().startsWith("video/")) {
    throw new Error("Le fichier source doit être une vidéo");
  }

  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength > 0 && contentLength > MAX_SOURCE_SIZE_BYTES) {
    throw new Error(`La vidéo source dépasse ${Math.floor(MAX_SOURCE_SIZE_BYTES / (1024 * 1024))} Mo`);
  }
}

async function resolvePlatformLogoUrl(admin: AdminClient): Promise<string | null> {
  const envUrl = Deno.env.get("PLATFORM_LOGO_URL");
  if (envUrl) return envUrl;

  try {
    const { data } = await admin
      .from("platform_settings")
      .select("value")
      .eq("key", "platform_logo_url")
      .maybeSingle();

    return ((data as PlatformSettingRow | null)?.value) ?? null;
  } catch {
    return null;
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

async function runCommand(command: string, args: string[], label: string) {
  const result = await new Deno.Command(command, {
    args,
    stdout: "piped",
    stderr: "piped",
  }).output();

  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);

  if (result.code !== 0) {
    throw new Error(`${label}: ${stderr || stdout || `code ${result.code}`}`);
  }

  return { stdout, stderr };
}

async function probeMedia(filePath: string): Promise<MediaMetadata> {
  const { stdout } = await runCommand(
    "ffprobe",
    [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_streams",
      "-show_format",
      filePath,
    ],
    "ffprobe",
  );

  const probe = JSON.parse(stdout) as ProbeResult;
  const streams = probe.streams || [];
  const videoStream = streams.find((stream) => stream.codec_type === "video");

  if (!videoStream?.width || !videoStream?.height) {
    throw new Error("Impossible de lire les métadonnées de la vidéo source");
  }

  const duration = Number(probe.format?.duration || "0");
  return {
    width: videoStream.width,
    height: videoStream.height,
    durationSeconds: Number.isFinite(duration) && duration > 0 ? duration : null,
    frameRate: videoStream.avg_frame_rate || videoStream.r_frame_rate || null,
    hasAudio: streams.some((stream) => stream.codec_type === "audio"),
  };
}

async function downloadFile(url: string, destinationPath: string, errorPrefix: string): Promise<void> {
  const response = await fetch(url, {
    headers: {
      "cache-control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`${errorPrefix} (${response.status})`);
  }

  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength > 0 && contentLength > MAX_SOURCE_SIZE_BYTES) {
    throw new Error(`La vidéo source dépasse ${Math.floor(MAX_SOURCE_SIZE_BYTES / (1024 * 1024))} Mo`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_SOURCE_SIZE_BYTES) {
    throw new Error(`La vidéo source dépasse ${Math.floor(MAX_SOURCE_SIZE_BYTES / (1024 * 1024))} Mo`);
  }

  await Deno.writeFile(destinationPath, bytes);
}

function buildFilterComplex(
  media: MediaMetadata,
  watermarkLabel: string,
  logoSize: { width: number; height: number } | null,
): string {
  const fontSize = clamp(Math.round(media.width * 0.024), 20, 36);
  const boxBorder = clamp(Math.round(fontSize * 0.5), 12, 20);
  const escapedLabel = escapeDrawtextValue(watermarkLabel);
  const drawtext = `drawtext=text='${escapedLabel}':fontcolor=white:fontsize=${fontSize}:box=1:boxcolor=black@0.45:boxborderw=${boxBorder}:shadowcolor=black@0.35:shadowx=2:shadowy=2:x=w-tw-${WATERMARK_MARGIN_PX}:y=h-th-${logoSize ? logoSize.height + WATERMARK_MARGIN_PX + 12 : WATERMARK_MARGIN_PX}`;

  if (!logoSize) {
    return `[0:v]${drawtext}[vout]`;
  }

  return [
    `[1:v]scale=${logoSize.width}:${logoSize.height}[wm_logo]`,
    `[0:v][wm_logo]overlay=x=W-w-${WATERMARK_MARGIN_PX}:y=H-h-${WATERMARK_MARGIN_PX}[wm_base]`,
    `[wm_base]${drawtext}[vout]`,
  ].join(";");
}

async function renderWatermarkVideo(options: {
  inputPath: string;
  outputPath: string;
  logoPath: string | null;
  media: MediaMetadata;
  logoSize: { width: number; height: number } | null;
  platformName: string;
  authorName: string;
}): Promise<void> {
  const { inputPath, outputPath, logoPath, media, logoSize, platformName, authorName } = options;
  const filterComplex = buildFilterComplex(media, getWatermarkLabel(platformName, authorName), logoSize);

  const args = [
    "-y",
    "-i",
    inputPath,
  ];

  if (logoPath && logoSize) {
    args.push("-i", logoPath);
  }

  args.push(
    "-filter_complex",
    filterComplex,
    "-map",
    "[vout]",
    "-map",
    "0:a?",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-c:a",
    "copy",
    outputPath,
  );

  await runCommand("ffmpeg", args, "ffmpeg watermark");
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

async function markJobFailed(admin: AdminClient, jobId: string, errorMessage: string) {
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

async function processWatermarkJob(supabaseUrl: string, serviceKey: string, jobId: string) {
  const admin = createClient(supabaseUrl, serviceKey);
  const tempDir = await Deno.makeTempDir({ prefix: "watermark-" });
  const inputPath = `${tempDir}/source.mp4`;
  const outputPath = `${tempDir}/watermarked.mp4`;
  const logoPath = `${tempDir}/logo`;

  try {
    const { data, error: fetchError } = await admin
      .from("video_watermark_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    const job = data as WatermarkJobRow | null;

    if (fetchError || !job) {
      throw new Error(fetchError?.message || "Job introuvable");
    }

    await updateJob(admin, jobId, {
      status: "processing",
      stage: "Validation de la source",
      progress: 10,
      started_at: new Date().toISOString(),
      attempts: job.attempts + 1,
      error_message: null,
      failed_at: null,
    });

    await validateSourceHttp(job.source_url);

    await updateJob(admin, jobId, {
      stage: "Téléchargement de la vidéo source",
      progress: 25,
    });

    await withRetry(
      "download-source",
      () => downloadFile(job.source_url, inputPath, "Téléchargement de la vidéo source impossible"),
      2,
    );

    const media = await probeMedia(inputPath);
    if (media.durationSeconds && media.durationSeconds > MAX_DURATION_SECONDS) {
      throw new Error(`La vidéo source dépasse ${Math.floor(MAX_DURATION_SECONDS / 60)} minutes`);
    }

    let resolvedLogoPath: string | null = null;
    let logoSize: { width: number; height: number } | null = null;
    const logoUrl = await resolvePlatformLogoUrl(admin);

    if (logoUrl) {
      try {
        await updateJob(admin, jobId, {
          stage: "Préparation du logo plateforme",
          progress: 40,
        });

        await withRetry(
          "download-logo",
          () => downloadFile(logoUrl, logoPath, "Téléchargement du logo impossible"),
          2,
        );

        const logoMeta = await probeMedia(logoPath);
        const targetWidth = clamp(Math.round(media.width * 0.1), 56, 120);
        const targetHeight = clamp(
          Math.round((logoMeta.height / logoMeta.width) * targetWidth),
          28,
          120,
        );

        resolvedLogoPath = logoPath;
        logoSize = { width: targetWidth, height: targetHeight };
      } catch (logoError) {
        console.warn("[watermark-video] logo skipped", logoError);
      }
    }

    await updateJob(admin, jobId, {
      stage: "Incrustation du watermark FFmpeg",
      progress: 65,
      metadata: {
        sourceWidth: media.width,
        sourceHeight: media.height,
        sourceFrameRate: media.frameRate,
      },
    });

    await renderWatermarkVideo({
      inputPath,
      outputPath,
      logoPath: resolvedLogoPath,
      media,
      logoSize,
      platformName: job.watermark_text,
      authorName: job.author_name,
    });

    await updateJob(admin, jobId, {
      stage: "Upload de l'export sécurisé",
      progress: 90,
    });

    const outputData = await Deno.readFile(outputPath);
    const storagePath = `${job.requested_by}/videos/watermarked/${sanitizeFileName(job.file_name)}`;

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
        sourceWidth: media.width,
        sourceHeight: media.height,
        sourceFrameRate: media.frameRate,
        outputSizeBytes: outputData.byteLength,
      },
    });

    console.log("[watermark-video] job completed", { jobId, storagePath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[watermark-video] job failed", { jobId, message, error });
    await markJobFailed(admin, jobId, message);
  } finally {
    await Deno.remove(tempDir, { recursive: true }).catch(() => undefined);
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
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser(token);

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

      const { data, error } = await admin
        .from("video_watermark_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("requested_by", auth.user.id)
        .maybeSingle();

      const job = data as WatermarkJobRow | null;

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

    const { data, error } = await admin
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
      .maybeSingle();

    const job = data as WatermarkJobRow | null;

    if (error || !job) {
      return jsonResponse(
        {
          success: false,
          message: error?.message || "Impossible de créer le job de watermark",
        },
        500,
      );
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

    return jsonResponse(
      {
        success: true,
        jobId: job.id,
        status: job.status,
        stage: job.stage,
        progress: job.progress,
        fileName,
        outputMimeType: OUTPUT_MIME_TYPE,
      },
      202,
    );
  } catch (error) {
    console.error("[watermark-video] error", error);
    return jsonResponse(
      {
        success: false,
        message: error instanceof Error ? error.message : "Erreur interne",
      },
      500,
    );
  }
});
