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

type CloudinaryUploadResult = {
  public_id: string;
  secure_url: string;
  duration?: number;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  audio?: { codec?: string };
  video?: { codec?: string };
  eager?: Array<{ secure_url: string; bytes?: number }>;
  error?: { message: string };
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
 * Encode a text value for use in a Cloudinary transformation URL.
 * Commas and forward-slashes are Cloudinary delimiters and must be percent-encoded.
 */
function encodeCloudinaryText(text: string): string {
  return encodeURIComponent(text);
}

/**
 * Build the Cloudinary eager-transformation string that:
 *  - scales the video to max 1280 px wide
 *  - overlays the logo image (fetched from logoUrl) 40×40 px at bottom-right if provided
 *  - draws the platform text (bottom-right)
 *  - draws @author above it
 *  - outputs mp4
 */
function buildCloudinaryEager(
  authorName: string,
  watermarkText: string,
  logoUrl: string | null,
): string {
  const parts: string[] = ["w_1280,c_limit"];

  if (logoUrl) {
    // l_fetch accepts a base64-encoded URL for remote image overlays
    const logoBase64 = btoa(logoUrl).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    parts.push(`l_fetch:${logoBase64},w_40,h_40,g_south_east,x_20,y_115,fl_layer_apply`);
  }

  // Platform name text – bottom-right with box background
  const text = encodeCloudinaryText(watermarkText);
  parts.push(
    `l_text:Arial_Bold_26:${text},co_white,g_south_east,x_20,y_20,bo_8px_solid_black@40,fl_layer_apply`,
  );

  // Author handle – one line above the platform text
  const author = encodeCloudinaryText(`@${authorName}`);
  parts.push(`l_text:Arial_20:${author},co_white,g_south_east,x_20,y_60,fl_layer_apply`);

  parts.push("f_mp4");

  return parts.join("/");
}

/**
 * Compute a Cloudinary API signature.
 * Params are sorted alphabetically, concatenated as key=value pairs, then the API secret is
 * appended before hashing with SHA-1.
 */
async function computeCloudinarySignature(
  params: Record<string, string>,
  apiSecret: string,
): Promise<string> {
  const sortedStr = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  const signStr = `${sortedStr}${apiSecret}`;
  const data = new TextEncoder().encode(signStr);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Upload a video to Cloudinary by URL (Cloudinary fetches it) and apply an eager
 * watermark transformation synchronously.  Returns the upload result including the
 * processed eager URL.
 */
async function uploadToCloudinary(
  sourceUrl: string,
  publicId: string,
  cloudName: string,
  apiKey: string,
  apiSecret: string,
  eagerTransformation: string,
): Promise<CloudinaryUploadResult> {
  const timestamp = String(Math.floor(Date.now() / 1000));

  const paramsToSign: Record<string, string> = {
    eager: eagerTransformation,
    eager_async: "false",
    public_id: publicId,
    timestamp,
  };

  const signature = await computeCloudinarySignature(paramsToSign, apiSecret);

  const formData = new FormData();
  formData.append("file", sourceUrl);
  formData.append("public_id", publicId);
  formData.append("timestamp", timestamp);
  formData.append("api_key", apiKey);
  formData.append("signature", signature);
  formData.append("eager", eagerTransformation);
  formData.append("eager_async", "false");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    { method: "POST", body: formData },
  );

  const result = await response.json() as CloudinaryUploadResult;

  if (!response.ok || result.error) {
    throw new Error(`Cloudinary upload: ${result.error?.message ?? response.statusText}`);
  }

  return result;
}

/**
 * Delete a previously uploaded video from Cloudinary (best-effort, errors are swallowed).
 */
async function deleteCloudinaryVideo(
  publicId: string,
  cloudName: string,
  apiKey: string,
  apiSecret: string,
): Promise<void> {
  try {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const paramsToSign: Record<string, string> = { public_id: publicId, timestamp };
    const signature = await computeCloudinarySignature(paramsToSign, apiSecret);

    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("timestamp", timestamp);
    formData.append("api_key", apiKey);
    formData.append("signature", signature);
    formData.append("resource_type", "video");

    await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/destroy`,
      { method: "POST", body: formData },
    );
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
 * Validate the metadata returned by Cloudinary after upload.
 * Replaces the ffprobe-based validateSourceProbe check.
 */
function validateCloudinaryMeta(meta: CloudinaryUploadResult): void {
  const duration = meta.duration ?? 0;

  if (!duration || !Number.isFinite(duration)) {
    throw new Error("La durée de la vidéo source est invalide");
  }

  if (duration > MAX_DURATION_SECONDS) {
    throw new Error("La durée de la vidéo dépasse la limite autorisée");
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

  const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
  const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
  const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");

  if (!cloudName || !apiKey || !apiSecret) {
    await markJobFailed(
      admin,
      jobId,
      "Configuration Cloudinary manquante. Veuillez définir CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET.",
    );
    return;
  }

  // Use the job ID as Cloudinary public_id to guarantee uniqueness and easy cleanup.
  const cloudinaryPublicId = `vw-${jobId}`;
  let cloudinaryUploaded = false;

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

    // Build the Cloudinary eager transformation for the watermark.
    const eagerTransformation = buildCloudinaryEager(job.author_name, job.watermark_text, logoUrl);

    // Upload source video to Cloudinary (they fetch from URL) and apply the watermark eagerly.
    const cloudMeta = await withRetry(
      "cloudinary-upload",
      () => uploadToCloudinary(job.source_url, cloudinaryPublicId, cloudName, apiKey, apiSecret, eagerTransformation),
    );
    cloudinaryUploaded = true;

    // Validate duration from Cloudinary metadata.
    validateCloudinaryMeta(cloudMeta);

    const eagerUrl = cloudMeta.eager?.[0]?.secure_url;
    if (!eagerUrl) {
      throw new Error("Cloudinary n'a pas retourné l'URL de la vidéo watermarkée");
    }

    await updateJob(admin, jobId, {
      stage: "Application du watermark",
      progress: 60,
      metadata: {
        sourceDurationSeconds: cloudMeta.duration ?? null,
        sourceHasAudio: Boolean(cloudMeta.audio),
        sourceWidth: cloudMeta.width ?? null,
        sourceHeight: cloudMeta.height ?? null,
      },
    });

    await updateJob(admin, jobId, {
      stage: "Upload de l'export sécurisé",
      progress: 85,
    });

    // Download the watermarked video from Cloudinary and upload to Supabase Storage.
    const outputResponse = await withRetry("download-watermarked", async () => {
      const res = await fetch(eagerUrl);
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
        sourceDurationSeconds: cloudMeta.duration ?? null,
        sourceHasAudio: Boolean(cloudMeta.audio),
        sourceWidth: cloudMeta.width ?? null,
        sourceHeight: cloudMeta.height ?? null,
        outputSizeBytes: outputData.byteLength,
      },
    });

    console.log("[watermark-video] job completed", { jobId, storagePath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[watermark-video] job failed", { jobId, message, error });
    await markJobFailed(admin, jobId, message);
  } finally {
    // Best-effort Cloudinary cleanup.
    if (cloudinaryUploaded) {
      await deleteCloudinaryVideo(cloudinaryPublicId, cloudName!, apiKey!, apiSecret!);
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
