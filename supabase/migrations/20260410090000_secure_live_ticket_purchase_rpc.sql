CREATE OR REPLACE FUNCTION public.purchase_live_ticket_authenticated(
  p_live_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id UUID;
  v_live public.user_live_streams%ROWTYPE;
  v_sc_to_fcfa_rate NUMERIC;
  v_commission_rate_pct NUMERIC;
  v_commission_rate NUMERIC;
  v_escrow_hours INTEGER;
  v_fcfa_amount NUMERIC;
  v_sc_amount NUMERIC;
  v_commission_amount NUMERIC;
  v_creator_amount NUMERIC;
  v_release_at TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  v_buyer_id := auth.uid();

  IF v_buyer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Non authentifié');
  END IF;

  SELECT * INTO v_live
  FROM public.user_live_streams
  WHERE id = p_live_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Live introuvable');
  END IF;

  IF v_live.entry_price IS NULL OR v_live.entry_price <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ce live est gratuit');
  END IF;

  IF v_live.status NOT IN ('scheduled', 'active') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ce live n''est pas disponible à l''achat');
  END IF;

  IF v_live.host_id = v_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'L''hôte ne peut pas acheter son propre ticket');
  END IF;

  SELECT sc_to_fcfa_rate
  INTO v_sc_to_fcfa_rate
  FROM public.currency_conversion_settings
  LIMIT 1;

  IF COALESCE(v_sc_to_fcfa_rate, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Taux de conversion non configuré');
  END IF;

  SELECT commission_rate
  INTO v_commission_rate_pct
  FROM public.live_commission_settings
  WHERE is_active = true
  LIMIT 1;

  v_commission_rate_pct := COALESCE(v_commission_rate_pct, 10);
  v_commission_rate := v_commission_rate_pct / 100;

  SELECT escrow_duration_hours
  INTO v_escrow_hours
  FROM public.live_fraud_limits
  WHERE is_active = true
  LIMIT 1;

  v_escrow_hours := COALESCE(v_escrow_hours, 24);
  v_fcfa_amount := v_live.entry_price;
  v_sc_amount := ROUND((v_fcfa_amount / v_sc_to_fcfa_rate) * 100) / 100;
  v_commission_amount := ROUND(v_sc_amount * v_commission_rate * 100) / 100;
  v_creator_amount := v_sc_amount - v_commission_amount;
  v_release_at := now() + make_interval(hours => v_escrow_hours);

  SELECT public.purchase_live_ticket(
    p_buyer_id := v_buyer_id,
    p_live_id := p_live_id,
    p_sc_amount := v_sc_amount,
    p_fcfa_amount := v_fcfa_amount,
    p_commission_rate := v_commission_rate_pct,
    p_commission_amount := v_commission_amount,
    p_creator_amount := v_creator_amount,
    p_release_at := v_release_at
  ) INTO v_result;

  IF COALESCE((v_result ->> 'success')::boolean, false) = false THEN
    RETURN v_result;
  END IF;

  RETURN v_result || jsonb_build_object(
    'sc_amount', v_sc_amount,
    'release_at', v_release_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_live_ticket_authenticated(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';