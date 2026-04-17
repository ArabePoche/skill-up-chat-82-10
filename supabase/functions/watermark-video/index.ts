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

type ImageKitUploadResult = {
  fileId: string;
  name: string;
  url: string;
  filePath: string;
  height?: number;
  width?: number;
  size?: number;
  fileType?: string;
  message?: string;
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

/**
 * Build Basic Authorization header for ImageKit API calls.
 * ImageKit uses HTTP Basic auth with the private key as username and empty password.
 */
function buildImageKitAuth(privateKey: string): string {
  return "Basic " + btoa(privateKey + ":");
}

/**
 * Sanitize text for use inside an ImageKit transformation string.
 * Commas and colons are transformation separators and must not appear in
 * text content. Spaces are also stripped for URL safety.
 */
function sanitizeWatermarkText(text: string, maxLength = 50): string {
  return text
    .replace(/[,: ]+/g, "_")
    .replace(/[^a-zA-Z0-9_@.\-]/g, "")
    .slice(0, maxLength);
}

/**
 * Build the ImageKit transformation string that:
 *  - limits the video to max 1280 px wide
 *  - draws the platform text at the bottom-right with a visible dark background
 *  - draws @author one line above it
 *
 * Note: the logo image overlay is intentionally omitted because it requires the
 * logo URL to be publicly reachable by ImageKit. If the URL is a private
 * Supabase storage URL, ImageKit will fail to fetch it and can abort the entire
 * transformation chain (including the text layers), making the watermark
 * completely invisible. Text-only overlays are reliable without this constraint.
 */
function buildImageKitTransformation(
  authorName: string,
  watermarkText: string,
  _logoUrl: string | null,
): string {
  const parts: string[] = ["w-1280,c-at_max"];

  // Platform name text – bottom-right corner.
  // co-FFFFFF  : white text (hex format – named colours like "white" are not
  //              reliably supported across all ImageKit plan tiers).
  // bg-00000099: semi-transparent black background (≈60 % opacity) so the
  //              watermark is legible on both dark and light video frames.
  // pa-8       : padding inside the background box for readability.
  const text = sanitizeWatermarkText(watermarkText);
  parts.push(`l-text,i-${text},fs-26,co-FFFFFF,bg-00000099,pa-8,lfo-bottom_right,lx-20,ly-20,l-end`);

  // Author handle – positioned one text-block above the platform text.
  const author = sanitizeWatermarkText(`@${authorName}`);
  parts.push(`l-text,i-${author},fs-20,co-FFFFFF,bg-00000099,pa-6,lfo-bottom_right,lx-20,ly-65,l-end`);

  return parts.join(":");
}

/**
 * Upload a video to ImageKit by URL (ImageKit fetches it).
 * Returns the upload result including the file URL for transformation delivery.
 */
async function uploadToImageKit(
  sourceUrl: string,
  fileName: string,
  privateKey: string,
): Promise<ImageKitUploadResult> {
  const formData = new FormData();
  formData.append("file", sourceUrl);
  formData.append("fileName", fileName);
  formData.append("folder", "/watermark-temp");
  formData.append("useUniqueFileName", "true");

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: buildImageKitAuth(privateKey) },
    body: formData,
  });

  const result = await response.json() as ImageKitUploadResult;

  if (!response.ok) {
    throw new Error(`ImageKit upload: ${result.message ?? response.statusText}`);
  }

  return result;
}

/**
 * Delete a previously uploaded file from ImageKit (best-effort, errors are swallowed).
 */
async function deleteImageKitFile(
  fileId: string,
  privateKey: string,
): Promise<void> {
  try {
    await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: buildImageKitAuth(privateKey) },
    });
  } catch {
    // Best-effort cleanup – do not let errors propagate.
  }
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

/**
 * Resolves the platform logo URL: first from the PLATFORM_LOGO_URL env var,
 * then falls back to the `platform_logo_url` key in the `platform_settings` table.
 */
async function resolvePlatformLogoUrl(admin: ReturnType<typeof createClient>): Promise<string | null> {
  const envUrl = Deno.env.get("PLATFORM_LOGO_URL");
  if (envUrl) return envUrl;

  try {
    const { data } = await admin
      .from("platform_settings")
      .select("value")
      .eq("key", "platform_logo_url")
      .maybeSingle();
    return data?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Validate the video source via an HTTP HEAD request.
 * Checks content-type (must be video/*) and content-length (must be within MAX_SOURCE_SIZE_BYTES).
 * Does not spawn any subprocess.
 */
async function validateSourceHttp(url: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(url, { method: "HEAD" });
  } catch {
    throw new Error("La source vidéo est inaccessible");
  }

  if (!response.ok) {
    throw new Error(`Source vidéo inaccessible (${response.status})`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType && !contentType.toLowerCase().startsWith("video/")) {
    throw new Error("Le fichier source doit être une vidéo");
  }

  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength > 0 && contentLength > MAX_SOURCE_SIZE_BYTES) {
    throw new Error("La vidéo source dépasse la taille maximale autorisée");
  }
}

/**
 * Validate that the ImageKit upload succeeded and returned a usable file URL.
 */
function validateImageKitMeta(meta: ImageKitUploadResult): void {
  if (!meta.url || !meta.fileId) {
    throw new Error("ImageKit n'a pas retourné les métadonnées attendues après l'upload");
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

async function processWatermarkJob(supabaseUrl: string, serviceKey: string, jobId: string) {
  const admin = createClient(supabaseUrl, serviceKey);

  const privateKey = Deno.env.get("IMAGEKIT_PRIVATE_KEY");

  if (!privateKey) {
    await markJobFailed(
      admin,
      jobId,
      "Configuration ImageKit manquante. Veuillez définir IMAGEKIT_PRIVATE_KEY.",
    );
    return;
  }

  // Use the job ID as ImageKit file name to guarantee uniqueness and easy cleanup.
  const imagekitFileName = `vw-${jobId}.mp4`;
  let imagekitFileId: string | null = null;

  try {
    const { data: job, error: fetchError } = await admin
      .from("video_watermark_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle<WatermarkJobRow>();

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

    // Lightweight HTTP-based validation (no subprocess).
    await validateSourceHttp(job.source_url);

    // Resolve the platform logo URL (best-effort, falls back to text-only).
    const logoUrl = await resolvePlatformLogoUrl(admin);

    await updateJob(admin, jobId, {
      stage: "Transfert vers le service de traitement",
      progress: 25,
    });

    // Build the ImageKit transformation string for the watermark.
    const transformation = buildImageKitTransformation(job.author_name, job.watermark_text, logoUrl);

    // Upload source video to ImageKit (they fetch from URL).
    const imagekitMeta = await withRetry(
      "imagekit-upload",
      () => uploadToImageKit(job.source_url, imagekitFileName, privateKey),
    );
    imagekitFileId = imagekitMeta.fileId;

    // Validate that the upload returned a usable URL.
    validateImageKitMeta(imagekitMeta);

    // Build the transformation delivery URL to download the watermarked video.
    const watermarkedUrl = `${imagekitMeta.url}?tr=${transformation}`;

    await updateJob(admin, jobId, {
      stage: "Application du watermark",
      progress: 60,
      metadata: {
        sourceWidth: imagekitMeta.width ?? null,
        sourceHeight: imagekitMeta.height ?? null,
      },
    });

    await updateJob(admin, jobId, {
      stage: "Upload de l'export sécurisé",
      progress: 85,
    });

    // Download the watermarked video from ImageKit and upload to Supabase Storage.
    const outputResponse = await withRetry("download-watermarked", async () => {
      const res = await fetch(watermarkedUrl);
      if (!res.ok) {
        throw new Error(`Téléchargement watermark impossible (${res.status})`);
      }
      return res;
    });

    const outputData = await outputResponse.arrayBuffer();

    // Store inside the user folder so bucket policies (first segment = user id) are satisfied.
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
        sourceWidth: imagekitMeta.width ?? null,
        sourceHeight: imagekitMeta.height ?? null,
        outputSizeBytes: outputData.byteLength,
      },
    });

    console.log("[watermark-video] job completed", { jobId, storagePath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[watermark-video] job failed", { jobId, message, error });
    await markJobFailed(admin, jobId, message);
  } finally {
    // Best-effort ImageKit cleanup.
    if (imagekitFileId && privateKey) {
      await deleteImageKitFile(imagekitFileId, privateKey);
    }
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
