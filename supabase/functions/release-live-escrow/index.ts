/**
 * Edge Function: release-live-escrow
 *
 * Releases pending live_payments whose escrow window has expired.
 * Intended to be called as a Supabase cron job (e.g. every 15 minutes)
 * or triggered by an admin action.
 *
 * Security: requires service_role or a secret header for cron invocation.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify cron secret or admin JWT
  const cronSecret = Deno.env.get("CRON_SECRET");
  const incomingSecret = req.headers.get("x-cron-secret");

  let authorized = false;

  if (cronSecret && incomingSecret === cronSecret) {
    authorized = true;
  } else {
    // Fall back to admin JWT check
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const { data: { user } } = await userClient.auth.getUser(token);
      if (user) {
        const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data: profile } = await admin
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.role === "admin") authorized = true;
      }
    }
  }

  if (!authorized) {
    return new Response(
      JSON.stringify({ success: false, message: "Non autorisé" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  // Find all expired pending payments
  const { data: payments, error: fetchError } = await admin
    .from("live_payments")
    .select("id")
    .eq("status", "pending")
    .lte("release_at", new Date().toISOString());

  if (fetchError) {
    console.error("release-live-escrow fetch error:", fetchError);
    return new Response(
      JSON.stringify({ success: false, message: fetchError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!payments || payments.length === 0) {
    return new Response(
      JSON.stringify({ success: true, released: 0, message: "Aucun paiement à libérer" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let released = 0;
  const errors: string[] = [];

  for (const payment of payments) {
    const { data: result, error: rpcError } = await admin.rpc(
      "release_live_payment_escrow",
      { p_payment_id: payment.id }
    );

    if (rpcError) {
      console.error(`release escrow error for payment ${payment.id}:`, rpcError);
      errors.push(payment.id);
    } else {
      const r = result as { success: boolean } | null;
      if (r?.success) released++;
      else errors.push(payment.id);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      released,
      errors: errors.length > 0 ? errors : undefined,
      total: payments.length,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
