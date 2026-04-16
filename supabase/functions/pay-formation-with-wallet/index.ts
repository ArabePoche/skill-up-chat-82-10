/**
 * Edge Function: pay-formation-with-wallet
 * Traite de manière sécurisée un paiement de formation en SC/SB côté backend.
 * Le frontend ne fait qu'invoquer cette fonction puis rafraîchir l'affichage.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type WalletCurrency = "soumboulah_cash" | "soumboulah_bonus";

interface ApiResponse {
  success: boolean;
  message: string;
  payment_id?: string | null;
  days_added?: number;
  hours_added?: number;
  remaining_days?: number;
  remaining_hours?: number;
  diagnostics?: {
    stage?: string;
    details?: string;
  };
}

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const respond = (payload: ApiResponse) => {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: jsonHeaders,
  });
};

const calculateRemainingDays = (
  totalDaysRemaining: number | null | undefined,
  lastPaymentDate: string | null | undefined,
) => {
  if (!totalDaysRemaining || totalDaysRemaining <= 0) {
    return 0;
  }

  if (!lastPaymentDate) {
    return totalDaysRemaining;
  }

  const lastPayment = new Date(lastPaymentDate);
  const currentDate = new Date();
  const daysSincePayment = Math.floor(
    (currentDate.getTime() - lastPayment.getTime()) / (1000 * 60 * 60 * 24),
  );

  return Math.max(0, totalDaysRemaining - daysSincePayment);
};

const calculateDaysAndHours = (amountFcfa: number, monthlyFee: number) => {
  const dailyRate = monthlyFee > 0 ? monthlyFee / 30 : 0;

  if (dailyRate <= 0) {
    return { days: 0, hours: 0 };
  }

  const totalDays = amountFcfa / dailyRate;
  let days = Math.floor(totalDays);
  let hours = Math.round((totalDays - days) * 24);

  if (hours >= 24) {
    days += Math.floor(hours / 24);
    hours = hours % 24;
  }

  return { days, hours };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return respond({
        success: false,
        message: "Configuration Supabase incomplète",
        diagnostics: { stage: "config" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return respond({
        success: false,
        message: "Non authentifié",
        diagnostics: { stage: "auth_header" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    const user = authData.user;

    if (authError || !user) {
      return respond({
        success: false,
        message: "Non authentifié",
        diagnostics: { stage: "auth_user", details: authError?.message },
      });
    }

    const body = await req.json();
    const formationId = String(body?.formationId || "").trim();
    const currency = body?.currency as WalletCurrency;
    const amount = Number(body?.amount || 0);

    if (!formationId) {
      return respond({
        success: false,
        message: "formationId requis",
        diagnostics: { stage: "validation" },
      });
    }

    if (!["soumboulah_cash", "soumboulah_bonus"].includes(currency)) {
      return respond({
        success: false,
        message: "Devise non prise en charge",
        diagnostics: { stage: "validation", details: String(currency) },
      });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return respond({
        success: false,
        message: "Montant invalide",
        diagnostics: { stage: "validation", details: String(amount) },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const nowIso = new Date().toISOString();
    const paymentDate = nowIso.split("T")[0];

    const { data: formation, error: formationError } = await admin
      .from("formations")
      .select("accepted_payment_methods")
      .eq("id", formationId)
      .maybeSingle();

    if (formationError || !formation) {
      return respond({
        success: false,
        message: "Formation introuvable",
        diagnostics: { stage: "formation_lookup", details: formationError?.message },
      });
    }

    const acceptedMethods = formation.accepted_payment_methods || [];
    if (!acceptedMethods.includes(currency)) {
      return respond({
        success: false,
        message: "Cette devise n'est pas acceptée pour cette formation",
        diagnostics: { stage: "accepted_methods", details: JSON.stringify(acceptedMethods) },
      });
    }

    let { data: wallet, error: walletError } = await admin
      .from("user_wallets")
      .select("user_id, soumboulah_cash, soumboulah_bonus")
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletError) {
      return respond({
        success: false,
        message: "Impossible de charger le portefeuille",
        diagnostics: { stage: "wallet_lookup", details: walletError.message },
      });
    }

    if (!wallet) {
      const { data: createdWallet, error: createWalletError } = await admin
        .from("user_wallets")
        .insert({ user_id: user.id })
        .select("user_id, soumboulah_cash, soumboulah_bonus")
        .single();

      if (createWalletError || !createdWallet) {
        return respond({
          success: false,
          message: "Impossible de créer le portefeuille",
          diagnostics: { stage: "wallet_create", details: createWalletError?.message },
        });
      }

      wallet = createdWallet;
    }

    const currentBalance = Number(
      currency === "soumboulah_cash"
        ? wallet.soumboulah_cash ?? 0
        : wallet.soumboulah_bonus ?? 0,
    );

    if (amount > currentBalance) {
      return respond({
        success: false,
        message: "Solde insuffisant",
        diagnostics: { stage: "wallet_balance", details: `${currentBalance}` },
      });
    }

    const [{ data: subscription }, { data: pricingOptions, error: pricingError }, { data: conversion, error: conversionError }] = await Promise.all([
      admin
        .from("enrollment_requests")
        .select("plan_type")
        .eq("user_id", user.id)
        .eq("formation_id", formationId)
        .eq("status", "approved")
        .maybeSingle(),
      admin
        .from("formation_pricing_options")
        .select("plan_type, price_monthly, is_active")
        .eq("formation_id", formationId)
        .eq("is_active", true),
      admin
        .from("currency_conversion_settings")
        .select("sc_to_fcfa_rate")
        .single(),
    ]);

    if (pricingError || !pricingOptions?.length) {
      return respond({
        success: false,
        message: "Tarification indisponible",
        diagnostics: { stage: "pricing", details: pricingError?.message },
      });
    }

    if (conversionError) {
      return respond({
        success: false,
        message: "Taux de conversion indisponible",
        diagnostics: { stage: "conversion", details: conversionError.message },
      });
    }

    const planType = subscription?.plan_type || pricingOptions[0]?.plan_type;
    const plan = pricingOptions.find((item) => item.plan_type === planType) || pricingOptions[0];
    const monthlyFee = Number(plan?.price_monthly || 0);
    const scToFcfaRate = Number(conversion?.sc_to_fcfa_rate || 0);

    if (monthlyFee <= 0) {
      return respond({
        success: false,
        message: "Tarif mensuel invalide",
        diagnostics: { stage: "monthly_fee", details: String(monthlyFee) },
      });
    }

    if (scToFcfaRate <= 0) {
      return respond({
        success: false,
        message: "Taux de conversion non configuré",
        diagnostics: { stage: "conversion_rate", details: String(scToFcfaRate) },
      });
    }

    const amountFcfa = amount * scToFcfaRate;
    const { days, hours } = calculateDaysAndHours(amountFcfa, monthlyFee);

    if (days <= 0 && hours <= 0) {
      return respond({
        success: false,
        message: "Montant insuffisant pour créditer du temps",
        diagnostics: { stage: "credit_time", details: JSON.stringify({ amountFcfa, monthlyFee }) },
      });
    }

    const { data: existingProgress, error: progressReadError } = await admin
      .from("student_payment_progress")
      .select("total_days_remaining, hours_remaining, last_payment_date")
      .eq("user_id", user.id)
      .eq("formation_id", formationId)
      .maybeSingle();

    if (progressReadError) {
      return respond({
        success: false,
        message: "Impossible de charger la progression de paiement",
        diagnostics: { stage: "progress_lookup", details: progressReadError.message },
      });
    }

    const currentDays = calculateRemainingDays(
      existingProgress?.total_days_remaining,
      existingProgress?.last_payment_date,
    );
    const currentHours = Number(existingProgress?.hours_remaining || 0);
    const totalHours = currentHours + hours;
    const additionalDaysFromHours = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    const newTotalDays = currentDays + days + additionalDaysFromHours;
    const newBalance = currentBalance - amount;

    const walletUpdate = currency === "soumboulah_cash"
      ? { soumboulah_cash: newBalance, updated_at: nowIso }
      : { soumboulah_bonus: newBalance, updated_at: nowIso };

    const { error: walletUpdateError } = await admin
      .from("user_wallets")
      .update(walletUpdate)
      .eq("user_id", user.id);

    if (walletUpdateError) {
      return respond({
        success: false,
        message: "Erreur lors du débit du portefeuille",
        diagnostics: { stage: "wallet_debit", details: walletUpdateError.message },
      });
    }

    let walletTransactionId: string | null = null;
    let paymentId: string | null = null;

    const rollbackWallet = async () => {
      const refundPayload = currency === "soumboulah_cash"
        ? { soumboulah_cash: currentBalance, updated_at: nowIso }
        : { soumboulah_bonus: currentBalance, updated_at: nowIso };

      await admin.from("user_wallets").update(refundPayload).eq("user_id", user.id);
    };

    try {
      const currencyLabel = currency === "soumboulah_cash" ? "SC" : "SB";

      const { data: walletTransaction, error: walletTransactionError } = await admin
        .from("wallet_transactions")
        .insert({
          user_id: user.id,
          currency,
          amount: -amount,
          transaction_type: "formation_payment",
          description: `Paiement formation (${amount} ${currencyLabel})`,
          reference_id: formationId,
          reference_type: "formation",
          metadata: {
            amount_fcfa: amountFcfa,
            days_added: days,
            hours_added: hours,
          },
        })
        .select("id")
        .single();

      if (walletTransactionError || !walletTransaction) {
        await rollbackWallet();
        return respond({
          success: false,
          message: "Erreur lors de l'enregistrement de la transaction",
          diagnostics: { stage: "wallet_transaction", details: walletTransactionError?.message },
        });
      }

      walletTransactionId = walletTransaction.id;

      const { data: payment, error: paymentError } = await admin
        .from("student_payment")
        .insert({
          user_id: user.id,
          formation_id: formationId,
          amount,
          payment_method: currency,
          is_request: false,
          status: "processed",
          payment_date: paymentDate,
          days_added: days,
          hours_added: hours,
          requested_at: nowIso,
          created_by: user.id,
          comment: `Paiement automatique via ${currencyLabel}: ${amount} ${currencyLabel} (≈ ${amountFcfa.toLocaleString("fr-FR")} FCFA)`,
        })
        .select("id")
        .single();

      if (paymentError || !payment) {
        await rollbackWallet();
        if (walletTransactionId) {
          await admin.from("wallet_transactions").delete().eq("id", walletTransactionId);
        }

        return respond({
          success: false,
          message: "Erreur lors de la création du paiement",
          diagnostics: { stage: "student_payment_insert", details: paymentError?.message },
        });
      }

      paymentId = payment.id;

      const { error: progressUpdateError } = await admin
        .from("student_payment_progress")
        .upsert({
          user_id: user.id,
          formation_id: formationId,
          total_days_remaining: newTotalDays,
          hours_remaining: remainingHours,
          last_payment_date: paymentDate,
          updated_at: nowIso,
        }, { onConflict: "user_id,formation_id" });

      if (progressUpdateError) {
        await rollbackWallet();
        if (paymentId) {
          await admin.from("student_payment").delete().eq("id", paymentId);
        }
        if (walletTransactionId) {
          await admin.from("wallet_transactions").delete().eq("id", walletTransactionId);
        }

        return respond({
          success: false,
          message: "Erreur lors de la mise à jour des jours restants",
          diagnostics: { stage: "progress_upsert", details: progressUpdateError.message },
        });
      }

      return respond({
        success: true,
        message: "Paiement effectué",
        payment_id: paymentId,
        days_added: days,
        hours_added: hours,
        remaining_days: newTotalDays,
        remaining_hours: remainingHours,
      });
    } catch (error) {
      console.error("pay-formation-with-wallet unexpected error:", error);

      await rollbackWallet();
      if (paymentId) {
        await admin.from("student_payment").delete().eq("id", paymentId);
      }
      if (walletTransactionId) {
        await admin.from("wallet_transactions").delete().eq("id", walletTransactionId);
      }

      return respond({
        success: false,
        message: "Erreur interne lors du paiement",
        diagnostics: {
          stage: "unexpected_inner",
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  } catch (error) {
    console.error("pay-formation-with-wallet error:", error);
    return respond({
      success: false,
      message: "Erreur interne",
      diagnostics: {
        stage: "unexpected_outer",
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});