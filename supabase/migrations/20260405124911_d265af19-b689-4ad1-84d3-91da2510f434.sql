
CREATE OR REPLACE FUNCTION public.resolve_gift_cancellation_claim(
  p_claim_id UUID,
  p_action TEXT,
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

  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = v_admin_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'message', 'Accès refusé');
  END IF;

  SELECT * INTO v_claim
  FROM public.gift_cancellation_claims
  WHERE id = p_claim_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Réclamation introuvable ou déjà traitée');
  END IF;

  IF p_action = 'approve' THEN
    SELECT ABS(amount)
    INTO v_full_amount
    FROM public.wallet_transactions
    WHERE transaction_type = 'gift_sent'
      AND user_id          = v_claim.sender_id
      AND currency         = v_claim.currency
      AND (
        id::text        = v_claim.transaction_ref
        OR reference_id = v_claim.transaction_ref
      )
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_full_amount IS NULL OR v_full_amount <= 0 THEN
      v_full_amount := v_claim.amount;
    END IF;

    IF v_claim.currency = 'soumboulah_cash' THEN
      UPDATE public.user_wallets
      SET blocked_cash = blocked_cash - v_claim.amount,
          updated_at   = now()
      WHERE user_id = v_claim.recipient_id;

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

    INSERT INTO public.wallet_transactions (
      user_id, currency, amount, transaction_type, description, reference_id, reference_type
    ) VALUES (
      v_claim.sender_id, v_claim.currency, v_full_amount, 'refund',
      'Remboursement suite à l''annulation du cadeau',
      v_claim.transaction_ref, 'refund'
    );

    UPDATE public.gift_cancellation_claims
    SET status     = 'approved',
        admin_notes = p_admin_notes,
        resolved_by = v_admin_id,
        resolved_at = now()
    WHERE id = p_claim_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Réclamation approuvée, fonds restitués.',
      'full_amount', v_full_amount
    );

  ELSIF p_action = 'reject' THEN
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
