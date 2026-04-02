-- Fonction sécurisée pour que l'admin résolve un litige
-- (Prive l'admin de devoir posséder des droits de mutation directs sur user_wallets)

CREATE OR REPLACE FUNCTION public.resolve_marketplace_dispute(
  p_dispute_id UUID,
  p_order_id UUID,
  p_resolution TEXT,
  p_admin_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_order public.marketplace_orders%ROWTYPE;
  v_dispute public.marketplace_disputes%ROWTYPE;
BEGIN
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Non connecté');
  END IF;

  -- Vérifier si admin
  IF NOT public.is_admin(v_admin_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Accès refusé - Réservé aux administrateurs');
  END IF;

  -- Récupérer la commande
  SELECT * INTO v_order
  FROM public.marketplace_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Commande introuvable');
  END IF;

  -- Récupérer le litige
  SELECT * INTO v_dispute
  FROM public.marketplace_disputes
  WHERE id = p_dispute_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Litige introuvable');
  END IF;

  IF p_resolution = 'refund' THEN
    -- Rembourser l'acheteur
    UPDATE public.user_wallets
    SET soumboulah_cash = COALESCE(soumboulah_cash, 0) + v_order.sc_amount,
        updated_at = now()
    WHERE user_id = v_order.buyer_id;

    -- Créer le portefeuille si non existant
    IF NOT FOUND THEN
      INSERT INTO public.user_wallets (user_id, soumboulah_cash)
      VALUES (v_order.buyer_id, v_order.sc_amount);
    END IF;

    -- Ajouter la transaction
    INSERT INTO public.wallet_transactions (
      user_id, currency, amount, transaction_type, description, reference_id, reference_type
    ) VALUES (
      v_order.buyer_id, 'soumboulah_cash', v_order.sc_amount, 'marketplace_refund',
      'Remboursement suite à un litige marketplace', p_order_id::TEXT, 'marketplace_order'
    );

    -- Mettre à jour la commande
    UPDATE public.marketplace_orders
    SET status = 'refunded',
        completed_at = now(),
        updated_at = now()
    WHERE id = p_order_id;

  ELSIF p_resolution = 'release' THEN
    -- Payer le vendeur
    UPDATE public.user_wallets
    SET soumboulah_cash = COALESCE(soumboulah_cash, 0) + v_order.seller_amount,
        updated_at = now()
    WHERE user_id = v_order.seller_id;

    IF NOT FOUND THEN
      INSERT INTO public.user_wallets (user_id, soumboulah_cash)
      VALUES (v_order.seller_id, v_order.seller_amount);
    END IF;

    -- Ajouter la transaction
    INSERT INTO public.wallet_transactions (
      user_id, currency, amount, transaction_type, description, reference_id, reference_type
    ) VALUES (
      v_order.seller_id, 'soumboulah_cash', v_order.seller_amount, 'marketplace_sale',
      'Paiement libéré suite à un litige (commission ' || v_order.commission_rate || '%)', 
      p_order_id::TEXT, 'marketplace_order'
    );

    -- Mettre à jour la commande
    UPDATE public.marketplace_orders
    SET status = 'completed',
        buyer_confirmed_at = now(),
        completed_at = now(),
        updated_at = now()
    WHERE id = p_order_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Résolution ' || p_resolution || ' invalide. (refund ou release attendu)');
  END IF;

  -- Mettre à jour le litige
  UPDATE public.marketplace_disputes
  SET status = CASE WHEN p_resolution = 'refund' THEN 'resolved_refund' ELSE 'resolved_release' END,
      admin_notes = p_admin_notes,
      updated_at = now()
  WHERE id = p_dispute_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_marketplace_dispute(UUID, UUID, TEXT, TEXT) TO authenticated;
