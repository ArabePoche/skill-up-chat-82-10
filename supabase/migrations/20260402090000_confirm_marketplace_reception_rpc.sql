-- Ajouter les types de transactions marketplace
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_transaction_type_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_transaction_type_check
  CHECK (transaction_type IN (
    'earn', 'spend', 'convert', 'gift', 'refund', 'purchase', 'topup',
    'gift_sent', 'gift_received', 'commission',
    'marketplace_escrow', 'marketplace_sale'
  ));

-- Fonction sécurisée pour confirmer la réception d'une commande marketplace
-- (nécessite SECURITY DEFINER pour créditer le portefeuille du vendeur via RLS)
CREATE OR REPLACE FUNCTION public.confirm_marketplace_reception(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id UUID;
  v_order public.marketplace_orders%ROWTYPE;
  v_seller_wallet public.user_wallets%ROWTYPE;
BEGIN
  v_buyer_id := auth.uid();

  IF v_buyer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Non connecté');
  END IF;

  -- Récupérer la commande en vérifiant que l'appelant est bien l'acheteur
  SELECT * INTO v_order
  FROM public.marketplace_orders
  WHERE id = p_order_id AND buyer_id = v_buyer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Commande introuvable');
  END IF;

  IF v_order.status NOT IN ('paid', 'shipped', 'delivered') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cette commande ne peut pas être confirmée');
  END IF;

  -- Récupérer le portefeuille du vendeur (accès autorisé grâce à SECURITY DEFINER)
  SELECT * INTO v_seller_wallet
  FROM public.user_wallets
  WHERE user_id = v_order.seller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Créer le portefeuille du vendeur s'il n'existe pas encore
    INSERT INTO public.user_wallets (user_id, soumboulah_cash)
    VALUES (v_order.seller_id, 0)
    RETURNING * INTO v_seller_wallet;
  END IF;

  -- Créditer le vendeur
  UPDATE public.user_wallets
  SET soumboulah_cash = COALESCE(soumboulah_cash, 0) + v_order.seller_amount,
      updated_at = now()
  WHERE user_id = v_order.seller_id;

  -- Transaction vendeur
  INSERT INTO public.wallet_transactions (
    user_id,
    currency,
    amount,
    transaction_type,
    description,
    reference_id,
    reference_type
  ) VALUES (
    v_order.seller_id,
    'soumboulah_cash',
    v_order.seller_amount,
    'marketplace_sale',
    'Vente marketplace confirmée (commission ' || v_order.commission_rate || '%)',
    p_order_id::text,
    'marketplace_order'
  );

  -- Mettre à jour le statut de la commande
  UPDATE public.marketplace_orders
  SET status = 'completed',
      buyer_confirmed_at = now(),
      completed_at = now(),
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_marketplace_reception(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
