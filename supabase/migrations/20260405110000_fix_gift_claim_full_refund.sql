-- Fix: approve a gift cancellation claim by refunding the sender the full
-- original sent amount (not just the net amount received after commission).
--
-- When a gift was sent:
--   sender paid:     full_amount   (e.g. 1000 SC)
--   recipient got:   net_amount    (e.g. 500 SC after 50% commission)
--   platform kept:   commission    (e.g. 500 SC)
--
-- The claim table stores `amount = net_amount` (what was blocked from recipient).
-- On approval we must:
--   1. Release the blocked net_amount from the recipient  (no change to their active balance)
--   2. Refund the full_amount to the sender
--
-- We obtain full_amount from the gift_sent wallet_transaction (negative amount → negate it).

CREATE OR REPLACE FUNCTION public.resolve_gift_cancellation_claim(
  p_claim_id UUID,
  p_action TEXT,       -- 'approve' or 'reject'
  p_admin_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id   UUID;
  v_claim      RECORD;
  v_is_admin   BOOLEAN;
  v_full_amount NUMERIC;
BEGIN
  v_admin_id := auth.uid();

  -- Verify admin role
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = v_admin_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'message', 'Accès refusé');
  END IF;

  -- Get claim
  SELECT * INTO v_claim
  FROM public.gift_cancellation_claims
  WHERE id = p_claim_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Réclamation introuvable ou déjà traitée');
  END IF;

  IF p_action = 'approve' THEN
    -- Look up the original amount the sender paid (gift_sent transaction has a negative amount).
    SELECT ABS(amount)
    INTO v_full_amount
    FROM public.wallet_transactions
    WHERE transaction_type = 'gift_sent'
      AND user_id          = v_claim.sender_id
      AND currency         = v_claim.currency
      AND (
        (v_claim.transaction_ref ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND (
            id::text         = v_claim.transaction_ref
            OR reference_id  = v_claim.transaction_ref
          )
        )
        OR reference_id = v_claim.transaction_ref
      )
    ORDER BY created_at DESC
    LIMIT 1;

    -- Fall back to the blocked (net) amount if we can't find the sent transaction.
    IF v_full_amount IS NULL OR v_full_amount <= 0 THEN
      v_full_amount := v_claim.amount;
    END IF;

    -- Release blocked funds from recipient (the net amount that was blocked at claim creation).
    IF v_claim.currency = 'soumboulah_cash' THEN
      UPDATE public.user_wallets
      SET blocked_cash = blocked_cash - v_claim.amount,
          updated_at   = now()
      WHERE user_id = v_claim.recipient_id;

      -- Refund the full original sent amount to the sender.
      UPDATE public.user_wallets
      SET soumboulah_cash = soumboulah_cash + v_full_amount,
          updated_at      = now()
      WHERE user_id = v_claim.sender_id;
    ELSE
      UPDATE public.user_wallets
      SET blocked_bonus = blocked_bonus - v_claim.amount,
          updated_at    = now()
      WHERE user_id = v_claim.recipient_id;

      UPDATE public.user_wallets
      SET soumboulah_bonus = soumboulah_bonus + v_full_amount,
          updated_at       = now()
      WHERE user_id = v_claim.sender_id;
    END IF;

    -- Record the refund transaction for the sender.
    INSERT INTO public.wallet_transactions (
      user_id, currency, amount, transaction_type, description, reference_id, reference_type
    ) VALUES (
      v_claim.sender_id, v_claim.currency, v_full_amount, 'refund',
      'Remboursement suite à l''annulation du cadeau',
      v_claim.transaction_ref, 'refund'
    );

    -- Update claim status.
    UPDATE public.gift_cancellation_claims
    SET status     = 'approved',
        admin_notes = p_admin_notes,
        resolved_by = v_admin_id,
        resolved_at = now()
    WHERE id = p_claim_id;

    RETURN jsonb_build_object('success', true, 'message', 'Réclamation approuvée, fonds restitués.');

  ELSIF p_action = 'reject' THEN
    -- Unblock funds and return them to the recipient.
    IF v_claim.currency = 'soumboulah_cash' THEN
      UPDATE public.user_wallets
      SET blocked_cash    = blocked_cash    - v_claim.amount,
          soumboulah_cash = soumboulah_cash + v_claim.amount,
          updated_at      = now()
      WHERE user_id = v_claim.recipient_id;
    ELSE
      UPDATE public.user_wallets
      SET blocked_bonus    = blocked_bonus    - v_claim.amount,
          soumboulah_bonus = soumboulah_bonus + v_claim.amount,
          updated_at       = now()
      WHERE user_id = v_claim.recipient_id;
    END IF;

    -- Update claim status.
    UPDATE public.gift_cancellation_claims
    SET status      = 'rejected',
        admin_notes = p_admin_notes,
        resolved_by = v_admin_id,
        resolved_at = now()
    WHERE id = p_claim_id;

    RETURN jsonb_build_object('success', true, 'message', 'Réclamation rejetée, fonds débloqués.');

  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Action invalide');
  END IF;
END;
$$;
