-- ============================================================
-- Scheduled Paid Live with Ticket Reservation & Escrow
-- ============================================================

-- 1. Add scheduling fields to user_live_streams
ALTER TABLE public.user_live_streams
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_attendees integer DEFAULT NULL;

-- 2. Extend status check to include 'scheduled'
ALTER TABLE public.user_live_streams
  DROP CONSTRAINT IF EXISTS user_live_streams_status_check;

ALTER TABLE public.user_live_streams
  ADD CONSTRAINT user_live_streams_status_check
  CHECK (status IN ('active', 'ended', 'scheduled'));

-- 3. Allow unauthenticated users to view public scheduled/active live info
-- (needed for public ticket page)
DROP POLICY IF EXISTS "Public can view public live streams" ON public.user_live_streams;
CREATE POLICY "Public can view public live streams"
ON public.user_live_streams
FOR SELECT
TO anon
USING (visibility = 'public');

-- 4. RPC: purchase_live_ticket (called by Edge Function with service_role)
-- Atomically: debit buyer, create live_payments escrow record
CREATE OR REPLACE FUNCTION public.purchase_live_ticket(
  p_buyer_id    uuid,
  p_live_id     uuid,
  p_sc_amount   numeric,   -- pre-calculated by Edge Function
  p_fcfa_amount numeric,   -- entry_price from live record
  p_commission_rate numeric,
  p_commission_amount numeric,
  p_creator_amount  numeric,
  p_release_at  timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_live         public.user_live_streams%ROWTYPE;
  v_buyer_balance numeric;
  v_paid_count   integer;
BEGIN
  -- Re-fetch live under lock to prevent race conditions
  SELECT * INTO v_live FROM public.user_live_streams WHERE id = p_live_id FOR SHARE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Live introuvable');
  END IF;

  IF v_live.entry_price IS NULL OR v_live.entry_price <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ce live est gratuit');
  END IF;

  IF v_live.status NOT IN ('scheduled', 'active') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ce live n''est pas disponible');
  END IF;

  IF v_live.host_id = p_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'L''hôte ne peut pas acheter son propre ticket');
  END IF;

  -- Check already purchased
  IF EXISTS (
    SELECT 1 FROM public.live_payments
    WHERE buyer_id = p_buyer_id AND live_id = p_live_id
      AND status IN ('pending', 'released')
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Vous avez déjà un ticket pour ce live');
  END IF;

  -- Check max attendees
  IF v_live.max_attendees IS NOT NULL THEN
    SELECT COUNT(*) INTO v_paid_count
    FROM public.live_payments
    WHERE live_id = p_live_id AND status IN ('pending', 'released');

    IF v_paid_count >= v_live.max_attendees THEN
      RETURN jsonb_build_object('success', false, 'message', 'Plus de places disponibles');
    END IF;
  END IF;

  -- Check buyer wallet balance
  SELECT soumboulah_cash INTO v_buyer_balance
  FROM public.user_wallets
  WHERE user_id = p_buyer_id;

  IF v_buyer_balance IS NULL OR v_buyer_balance < p_sc_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solde SC insuffisant');
  END IF;

  -- Debit buyer wallet
  UPDATE public.user_wallets
  SET soumboulah_cash = soumboulah_cash - p_sc_amount,
      updated_at = now()
  WHERE user_id = p_buyer_id;

  -- Record buyer transaction
  INSERT INTO public.wallet_transactions (
    user_id, currency, amount, transaction_type, description, reference_id, reference_type
  ) VALUES (
    p_buyer_id, 'soumboulah_cash', -p_sc_amount,
    'live_entry',
    'Ticket live payant : ' || v_live.title,
    p_live_id::text,
    'user_live_stream'
  );

  -- Create escrow record
  INSERT INTO public.live_payments (
    buyer_id, creator_id, live_id,
    amount, commission_rate, commission_amount, creator_amount,
    currency, status, release_at
  ) VALUES (
    p_buyer_id, v_live.host_id, p_live_id,
    p_sc_amount, p_commission_rate, p_commission_amount, p_creator_amount,
    'SC', 'pending', p_release_at
  );

  RETURN jsonb_build_object('success', true, 'message', 'Ticket acheté avec succès');
END;
$$;

-- 5. RPC: release_live_payment_escrow (called by Edge Function cron or manually)
CREATE OR REPLACE FUNCTION public.release_live_payment_escrow(p_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.live_payments%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM public.live_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Paiement introuvable');
  END IF;

  IF v_payment.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ce paiement ne peut pas être libéré');
  END IF;

  -- Credit creator wallet
  INSERT INTO public.user_wallets (user_id, soumboulah_cash)
  VALUES (v_payment.creator_id, v_payment.creator_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    soumboulah_cash = user_wallets.soumboulah_cash + v_payment.creator_amount,
    updated_at = now();

  -- Record creator transaction
  INSERT INTO public.wallet_transactions (
    user_id, currency, amount, transaction_type, description, reference_id, reference_type
  ) VALUES (
    v_payment.creator_id, 'soumboulah_cash', v_payment.creator_amount,
    'live_entry',
    'Recette live (commission ' || ROUND(v_payment.commission_rate, 0) || '% déduite)',
    v_payment.live_id::text,
    'user_live_stream'
  );

  -- Mark as released
  UPDATE public.live_payments
  SET status = 'released', released_at = now(), updated_at = now()
  WHERE id = p_payment_id;

  RETURN jsonb_build_object('success', true, 'creator_amount', v_payment.creator_amount);
END;
$$;

-- 6. RPC: file_live_dispute (buyer opens a dispute within 24h escrow window)
CREATE OR REPLACE FUNCTION public.file_live_dispute(
  p_live_id uuid,
  p_reason  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id uuid;
  v_payment  public.live_payments%ROWTYPE;
BEGIN
  v_buyer_id := auth.uid();
  IF v_buyer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Non authentifié');
  END IF;

  SELECT * INTO v_payment
  FROM public.live_payments
  WHERE buyer_id = v_buyer_id AND live_id = p_live_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Paiement introuvable');
  END IF;

  IF v_payment.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'La fenêtre de réclamation est fermée');
  END IF;

  IF now() > v_payment.release_at THEN
    RETURN jsonb_build_object('success', false, 'message', 'Le délai de réclamation de 24h est expiré');
  END IF;

  -- Create dispute record
  INSERT INTO public.live_payment_disputes (payment_id, claimant_id, reason, status)
  VALUES (v_payment.id, v_buyer_id, p_reason, 'open');

  -- Mark payment as disputed
  UPDATE public.live_payments
  SET status = 'disputed', disputed_at = now(), updated_at = now()
  WHERE id = v_payment.id;

  RETURN jsonb_build_object('success', true, 'message', 'Réclamation soumise. Les administrateurs examineront votre demande.');
END;
$$;

-- 7. RPC: admin_resolve_live_dispute (admin only)
CREATE OR REPLACE FUNCTION public.admin_resolve_live_dispute(
  p_dispute_id uuid,
  p_resolution text,   -- 'refund' | 'release'
  p_notes      text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_dispute  public.live_payment_disputes%ROWTYPE;
  v_payment  public.live_payments%ROWTYPE;
BEGIN
  v_admin_id := auth.uid();

  -- Verify admin role
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Accès refusé');
  END IF;

  IF p_resolution NOT IN ('refund', 'release') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Résolution invalide (refund ou release)');
  END IF;

  SELECT * INTO v_dispute FROM public.live_payment_disputes WHERE id = p_dispute_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Réclamation introuvable');
  END IF;
  IF v_dispute.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cette réclamation a déjà été traitée');
  END IF;

  SELECT * INTO v_payment FROM public.live_payments WHERE id = v_dispute.payment_id FOR UPDATE;
  IF NOT FOUND OR v_payment.status != 'disputed' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Paiement introuvable ou état invalide');
  END IF;

  IF p_resolution = 'refund' THEN
    -- Refund buyer
    UPDATE public.user_wallets
    SET soumboulah_cash = soumboulah_cash + v_payment.amount,
        updated_at = now()
    WHERE user_id = v_payment.buyer_id;

    INSERT INTO public.wallet_transactions (
      user_id, currency, amount, transaction_type, description, reference_id, reference_type
    ) VALUES (
      v_payment.buyer_id, 'soumboulah_cash', v_payment.amount,
      'live_entry',
      'Remboursement ticket live (réclamation approuvée)',
      v_payment.live_id::text,
      'user_live_stream'
    );

    UPDATE public.live_payments
    SET status = 'refunded', resolved_at = now(), updated_at = now()
    WHERE id = v_payment.id;

  ELSE
    -- Release to creator despite dispute
    INSERT INTO public.user_wallets (user_id, soumboulah_cash)
    VALUES (v_payment.creator_id, v_payment.creator_amount)
    ON CONFLICT (user_id)
    DO UPDATE SET
      soumboulah_cash = user_wallets.soumboulah_cash + v_payment.creator_amount,
      updated_at = now();

    INSERT INTO public.wallet_transactions (
      user_id, currency, amount, transaction_type, description, reference_id, reference_type
    ) VALUES (
      v_payment.creator_id, 'soumboulah_cash', v_payment.creator_amount,
      'live_entry',
      'Recette live (réclamation refusée, commission déduite)',
      v_payment.live_id::text,
      'user_live_stream'
    );

    UPDATE public.live_payments
    SET status = 'released', released_at = now(), resolved_at = now(), updated_at = now()
    WHERE id = v_payment.id;
  END IF;

  -- Close dispute
  UPDATE public.live_payment_disputes
  SET status = CASE WHEN p_resolution = 'refund' THEN 'approved' ELSE 'rejected' END,
      resolution = p_resolution,
      resolved_by = v_admin_id,
      admin_notes = p_notes,
      resolved_at = now(),
      updated_at = now()
  WHERE id = p_dispute_id;

  RETURN jsonb_build_object('success', true, 'resolution', p_resolution);
END;
$$;

-- 8. RLS on live_payments: allow buyers to insert via service role (Edge Fn) + read their own
-- Insertions are service_role only (Edge Function), reads via existing policies
-- No additional INSERT policy needed (Edge Function uses service_role)

-- 9. Index for scheduled live discovery
CREATE INDEX IF NOT EXISTS user_live_streams_scheduled_idx
  ON public.user_live_streams(scheduled_at)
  WHERE status = 'scheduled';
