-- Fonction sécurisée pour créer une commande marketplace et débiter le portefeuille acheteur
-- (nécessite SECURITY DEFINER pour modifier user_wallets et wallet_transactions via RLS)

-- Ajouter le type de transaction manquant si nécessaire
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_transaction_type_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_transaction_type_check
  CHECK (transaction_type IN (
    'earn', 'spend', 'convert', 'gift', 'refund', 'purchase', 'topup',
    'gift_sent', 'gift_received', 'commission',
    'marketplace_escrow', 'marketplace_sale', 'marketplace_refund'
  ));

CREATE OR REPLACE FUNCTION public.create_marketplace_order(
  p_product_id UUID,
  p_seller_id UUID,
  p_quantity INTEGER,
  p_unit_price NUMERIC,
  p_sc_amount NUMERIC,
  p_commission_rate NUMERIC,
  p_shipping_address TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id UUID;
  v_buyer_wallet public.user_wallets%ROWTYPE;
  v_total_amount NUMERIC;
  v_total_sc NUMERIC;
  v_commission_amount NUMERIC;
  v_seller_amount NUMERIC;
  v_auto_release_at TIMESTAMPTZ;
  v_order public.marketplace_orders%ROWTYPE;
BEGIN
  v_buyer_id := auth.uid();

  IF v_buyer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Non connecté');
  END IF;

  v_total_amount := p_unit_price * p_quantity;
  v_total_sc := p_sc_amount * p_quantity;
  v_commission_amount := ROUND(v_total_sc * p_commission_rate / 100, 2);
  v_seller_amount := v_total_sc - v_commission_amount;
  v_auto_release_at := now() + INTERVAL '7 days';

  -- Vérifier et verrouiller le portefeuille de l'acheteur
  SELECT * INTO v_buyer_wallet
  FROM public.user_wallets
  WHERE user_id = v_buyer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Portefeuille introuvable');
  END IF;

  IF v_buyer_wallet.soumboulah_cash < v_total_sc THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Solde SC insuffisant. Vous avez ' || v_buyer_wallet.soumboulah_cash || ' SC, il faut ' || v_total_sc || ' SC.'
    );
  END IF;

  -- Débiter le portefeuille de l'acheteur
  UPDATE public.user_wallets
  SET soumboulah_cash = soumboulah_cash - v_total_sc,
      updated_at = now()
  WHERE user_id = v_buyer_id;

  -- Créer la commande
  INSERT INTO public.marketplace_orders (
    buyer_id, seller_id, product_id,
    quantity, unit_price, total_amount,
    sc_amount, commission_rate, commission_amount, seller_amount,
    status, shipping_address, notes, auto_release_at
  ) VALUES (
    v_buyer_id, p_seller_id, p_product_id,
    p_quantity, p_unit_price, v_total_amount,
    v_total_sc, p_commission_rate, v_commission_amount, v_seller_amount,
    'paid', p_shipping_address, p_notes, v_auto_release_at
  )
  RETURNING * INTO v_order;

  -- Enregistrer la transaction de débit
  INSERT INTO public.wallet_transactions (
    user_id, currency, amount,
    transaction_type, description, reference_id, reference_type
  ) VALUES (
    v_buyer_id, 'soumboulah_cash', -v_total_sc,
    'marketplace_escrow',
    'Achat marketplace (escrow) - ' || p_quantity || ' article(s)',
    v_order.id::text, 'marketplace_order'
  );

  RETURN jsonb_build_object('success', true, 'order', row_to_json(v_order));
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_marketplace_order(UUID, UUID, INTEGER, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
