-- Contribution solidaire sécurisée pour respecter les politiques RLS du wallet
CREATE OR REPLACE FUNCTION public.contribute_to_solidarity_campaign(
  p_campaign_id UUID,
  p_amount NUMERIC,
  p_message TEXT DEFAULT NULL,
  p_is_anonymous BOOLEAN DEFAULT false,
  p_commission_rate NUMERIC DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_wallet public.user_wallets%ROWTYPE;
  v_campaign public.solidarity_campaigns%ROWTYPE;
  v_commission_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_contribution_id UUID;
  v_new_collected NUMERIC;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Non connecté');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Montant invalide');
  END IF;

  SELECT *
  INTO v_campaign
  FROM public.solidarity_campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cagnotte introuvable');
  END IF;

  IF v_campaign.status NOT IN ('approved', 'pending') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cette cagnotte n’accepte pas de contributions');
  END IF;

  IF v_campaign.status = 'pending' AND v_campaign.creator_id <> v_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cette cagnotte n’accepte pas encore les contributions');
  END IF;

  SELECT *
  INTO v_wallet
  FROM public.user_wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Portefeuille introuvable');
  END IF;

  IF COALESCE(v_wallet.soumboulah_cash, 0) < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solde SC insuffisant');
  END IF;

  v_commission_rate := COALESCE(p_commission_rate, v_campaign.commission_rate, 0);
  v_commission_amount := ROUND(p_amount * v_commission_rate / 100, 8);

  INSERT INTO public.solidarity_contributions (
    campaign_id,
    contributor_id,
    amount,
    commission_amount,
    message,
    is_anonymous
  ) VALUES (
    p_campaign_id,
    v_user_id,
    p_amount,
    v_commission_amount,
    p_message,
    COALESCE(p_is_anonymous, false)
  )
  RETURNING id INTO v_contribution_id;

  UPDATE public.user_wallets
  SET soumboulah_cash = soumboulah_cash - p_amount,
      updated_at = now()
  WHERE user_id = v_user_id;

  v_new_collected := COALESCE(v_campaign.collected_amount, 0) + p_amount;

  UPDATE public.solidarity_campaigns
  SET collected_amount = v_new_collected,
      contributor_count = (
        SELECT COUNT(DISTINCT contribution.contributor_id)::INTEGER
        FROM public.solidarity_contributions AS contribution
        WHERE contribution.campaign_id = p_campaign_id
      ),
      status = CASE
        WHEN v_new_collected >= COALESCE(v_campaign.goal_amount, 0) THEN 'completed'
        ELSE status
      END,
      updated_at = now()
  WHERE id = p_campaign_id;

  INSERT INTO public.wallet_transactions (
    user_id,
    currency,
    amount,
    transaction_type,
    description,
    reference_id,
    reference_type,
    metadata,
    created_at
  ) VALUES (
    v_user_id,
    'soumboulah_cash',
    -p_amount,
    'spend',
    'Contribution à la cagnotte "' || v_campaign.title || '"',
    p_campaign_id::text,
    'solidarity_campaign',
    jsonb_build_object(
      'contribution_id', v_contribution_id,
      'campaign_title', v_campaign.title,
      'contribution_message', p_message
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Contribution envoyée avec succès',
    'contribution_id', v_contribution_id,
    'campaign_id', p_campaign_id,
    'new_collected_amount', v_new_collected
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.contribute_to_solidarity_campaign(UUID, NUMERIC, TEXT, BOOLEAN, NUMERIC) TO authenticated;

NOTIFY pgrst, 'reload schema';