-- Fix: allow gift cancellation claims to be created from either
-- the shared transfer reference_id or the sender wallet transaction id.

CREATE OR REPLACE FUNCTION public.create_gift_cancellation_claim(
  p_transaction_ref TEXT,
  p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_recipient_id UUID;
  v_amount NUMERIC;
  v_currency TEXT;
  v_claim_id UUID;
  v_recipient_balance NUMERIC;
  v_claim_ref TEXT;
  v_sent_reference_id TEXT;
  v_sent_created_at TIMESTAMP WITH TIME ZONE;
BEGIN
  v_sender_id := auth.uid();

  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Non authentifié');
  END IF;

  -- Resolve the original sender transaction from either:
  -- 1. its own wallet transaction id, or
  -- 2. the shared transfer reference_id.
  SELECT
    COALESCE(NULLIF(description, '')::jsonb ->> 'partner_id', NULL)::uuid,
    currency,
    reference_id,
    created_at,
    COALESCE(reference_id, id::text)
  INTO v_recipient_id, v_currency, v_sent_reference_id, v_sent_created_at, v_claim_ref
  FROM public.wallet_transactions
  WHERE transaction_type = 'gift_sent'
    AND user_id = v_sender_id
    AND (
      id::text = p_transaction_ref
      OR (reference_id IS NOT NULL AND reference_id = p_transaction_ref)
    )
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_recipient_id IS NULL OR v_currency IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Transaction non trouvée');
  END IF;

  -- Avoid duplicate claims for the same gift transfer.
  IF EXISTS (
    SELECT 1
    FROM public.gift_cancellation_claims
    WHERE transaction_ref = v_claim_ref
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Une réclamation existe déjà pour ce cadeau');
  END IF;

  -- Resolve the recipient-side amount.
  SELECT amount
  INTO v_amount
  FROM public.wallet_transactions
  WHERE transaction_type = 'gift_received'
    AND user_id = v_recipient_id
    AND currency = v_currency
    AND (
      (v_sent_reference_id IS NOT NULL AND reference_id = v_sent_reference_id)
      OR (
        v_sent_reference_id IS NULL
        AND description LIKE '{%'
        AND description::jsonb ->> 'partner_id' = v_sender_id::text
        AND created_at BETWEEN v_sent_created_at - INTERVAL '10 minutes' AND v_sent_created_at + INTERVAL '10 minutes'
      )
    )
  ORDER BY ABS(EXTRACT(EPOCH FROM (created_at - v_sent_created_at))) ASC
  LIMIT 1;

  IF v_amount IS NULL OR v_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Transaction non trouvée');
  END IF;

  IF v_currency = 'soumboulah_cash' THEN
    SELECT soumboulah_cash INTO v_recipient_balance
    FROM public.user_wallets
    WHERE user_id = v_recipient_id;
  ELSE
    SELECT soumboulah_bonus INTO v_recipient_balance
    FROM public.user_wallets
    WHERE user_id = v_recipient_id;
  END IF;

  IF COALESCE(v_recipient_balance, 0) < v_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solde du destinataire insuffisant pour bloquer les fonds');
  END IF;

  INSERT INTO public.gift_cancellation_claims (
    transaction_ref, sender_id, recipient_id, amount, currency, reason
  ) VALUES (
    v_claim_ref, v_sender_id, v_recipient_id, v_amount, v_currency, p_reason
  ) RETURNING id INTO v_claim_id;

  IF v_currency = 'soumboulah_cash' THEN
    UPDATE public.user_wallets
    SET soumboulah_cash = soumboulah_cash - v_amount,
        blocked_cash = blocked_cash + v_amount,
        updated_at = now()
    WHERE user_id = v_recipient_id;
  ELSE
    UPDATE public.user_wallets
    SET soumboulah_bonus = soumboulah_bonus - v_amount,
        blocked_bonus = blocked_bonus + v_amount,
        updated_at = now()
    WHERE user_id = v_recipient_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Réclamation envoyée et fonds bloqués',
    'claim_id', v_claim_id
  );
END;
$$;