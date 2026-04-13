import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

type WatermarkCleanupJob = {
  id: string;
  output_bucket: string;
  output_path: string | null;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const incomingSecret = req.headers.get("x-cron-secret");
  const authorizedBySecret = Boolean(cronSecret && incomingSecret === cronSecret);

  if (!authorizedBySecret) {
    return jsonResponse({ success: false, message: "Non autorisé" }, 403);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: jobs, error } = await admin
      .from("video_watermark_jobs")
      .select("id, output_bucket, output_path")
      .eq("status", "completed")
      .not("output_path", "is", null)
      .lte("expires_at", new Date().toISOString());

    if (error) {
      throw new Error(error.message);
    }

    let cleaned = 0;
    const failedJobIds: string[] = [];

    for (const job of (jobs || []) as WatermarkCleanupJob[]) {
      try {
        if (job.output_path) {
          const { error: removeError } = await admin.storage
            .from(job.output_bucket)
            .remove([job.output_path]);

          if (removeError) {
            throw new Error(removeError.message);
          }
        }

        const { error: updateError } = await admin
          .from("video_watermark_jobs")
          .update({
            status: "expired",
            stage: "Export expiré",
            output_path: null,
          })
          .eq("id", job.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        cleaned += 1;
      } catch (cleanupError) {
        console.error("[cleanup-watermark-jobs] cleanup failed", { jobId: job.id, cleanupError });
        failedJobIds.push(job.id);
      }
    }

    return jsonResponse({
      success: true,
      cleaned,
      failedJobIds: failedJobIds.length > 0 ? failedJobIds : undefined,
      total: jobs?.length || 0,
    });
  } catch (error) {
    console.error("[cleanup-watermark-jobs] error", error);
    return jsonResponse({
      success: false,
      message: error instanceof Error ? error.message : "Erreur interne",
    }, 500);
  }
});
