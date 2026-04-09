/**
 * Edge Function: purchase-live-ticket
 *
 * Secure backend-only ticket purchase for paid live streams.
 * No financial logic is exposed to the frontend.
 *
 * Flow:
 * 1. Authenticate caller via JWT
 * 2. Fetch live entry_price, status, max_attendees from DB (service_role)
 * 3. Fetch SC conversion rate from DB
 * 4. Fetch platform commission from live_commission_settings
 * 5. Calculate amounts server-side
 * 6. Call purchase_live_ticket RPC to atomically debit wallet & create escrow
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Non authentifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use anon client to verify JWT
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Non authentifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { live_id } = await req.json();
    if (!live_id) {
      return new Response(
        JSON.stringify({ success: false, message: "live_id requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service_role for all DB operations from here on
    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch live stream details
    const { data: live, error: liveError } = await admin
      .from("user_live_streams")
      .select("id, host_id, title, status, entry_price, max_attendees, scheduled_at")
      .eq("id", live_id)
      .maybeSingle();

    if (liveError || !live) {
      return new Response(
        JSON.stringify({ success: false, message: "Live introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!live.entry_price || live.entry_price <= 0) {
      return new Response(
        JSON.stringify({ success: false, message: "Ce live est gratuit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["scheduled", "active"].includes(live.status)) {
      return new Response(
        JSON.stringify({ success: false, message: "Ce live n'est pas disponible à l'achat" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (live.host_id === user.id) {
      return new Response(
        JSON.stringify({ success: false, message: "L'hôte ne peut pas acheter son propre ticket" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch SC conversion rate (server-side only)
    const { data: rateData } = await admin
      .from("currency_conversion_settings")
      .select("sc_to_fcfa_rate")
      .single();

    const scToFcfaRate = rateData?.sc_to_fcfa_rate ?? 0;
    if (scToFcfaRate <= 0) {
      return new Response(
        JSON.stringify({ success: false, message: "Taux de conversion non configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch platform commission rate
    const { data: commissionData } = await admin
      .from("live_commission_settings")
      .select("commission_rate")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const commissionRatePct = commissionData?.commission_rate ?? 10;
    const commissionRate = commissionRatePct / 100;

    // Fetch escrow duration
    const { data: fraudData } = await admin
      .from("live_fraud_limits")
      .select("escrow_duration_hours")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const escrowHours = fraudData?.escrow_duration_hours ?? 24;

    // Server-side amount calculation — never trust frontend for this
    const fcfaAmount = live.entry_price;
    const scAmount = Math.round((fcfaAmount / scToFcfaRate) * 100) / 100;
    const commissionAmount = Math.round(scAmount * commissionRate * 100) / 100;
    // Use subtraction without re-rounding to avoid sum(commission + creator) != scAmount discrepancy
    const creatorAmount = scAmount - commissionAmount;

    const releaseAt = new Date(Date.now() + escrowHours * 60 * 60 * 1000).toISOString();

    // Atomically purchase ticket via SECURITY DEFINER RPC
    const { data: result, error: rpcError } = await admin.rpc("purchase_live_ticket", {
      p_buyer_id: user.id,
      p_live_id: live_id,
      p_sc_amount: scAmount,
      p_fcfa_amount: fcfaAmount,
      p_commission_rate: commissionRatePct,
      p_commission_amount: commissionAmount,
      p_creator_amount: creatorAmount,
      p_release_at: releaseAt,
    });

    if (rpcError) {
      console.error("purchase_live_ticket RPC error:", rpcError);
      return new Response(
        JSON.stringify({ success: false, message: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rpcResult = result as { success: boolean; message: string } | null;

    if (!rpcResult?.success) {
      return new Response(
        JSON.stringify({ success: false, message: rpcResult?.message ?? "Échec du paiement" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Ticket acheté avec succès",
        sc_amount: scAmount,
        release_at: releaseAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("purchase-live-ticket error:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
