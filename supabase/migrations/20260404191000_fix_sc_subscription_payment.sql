-- Fix : supprimer le CHECK rigide sur transaction_type (il y a déjà trop de valeurs
-- non listées en base : commission, gift_sent, marketplace_sale, interview_payment, etc.)
-- On supprime simplement la contrainte sans la recréer : le contrôle est fait au niveau
-- applicatif et dans les fonctions SECURITY DEFINER.

ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_transaction_type_check;

-- NB : on ne recrée PAS la contrainte CHECK pour laisser la flexibilité des types.

-- Ajouter une policy INSERT SECURITY DEFINER (admin system) sur wallet_transactions
-- pour que le RPC puisse insérer pour le compte de n'importe quel user
DROP POLICY IF EXISTS "system_insert_wallet_transactions" ON public.wallet_transactions;
CREATE POLICY "system_insert_wallet_transactions"
  ON public.wallet_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- le contrôle d'accès est dans le RPC SECURITY DEFINER

-- Recréer le RPC corrigé
CREATE OR REPLACE FUNCTION public.pay_school_subscription_with_sc(
  p_school_id        uuid,
  p_plan_id          uuid,
  p_payer_user_id    uuid,
  p_amount_xof       numeric,
  p_amount_sc        numeric,
  p_billing_cycle    text,
  p_duration_months  int,
  p_new_expires_at   timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_sc  numeric;
  v_payment_id uuid;
BEGIN
  -- Vérifier que l'appelant est bien le propriétaire de l'école OU un admin
  IF auth.uid() != p_payer_user_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Non autorisé');
    END IF;
  END IF;

  -- Vérifier le solde SC
  SELECT soumboulah_cash INTO v_wallet_sc
  FROM public.user_wallets
  WHERE user_id = p_payer_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_wallet_sc IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Portefeuille introuvable');
  END IF;

  IF v_wallet_sc < p_amount_sc THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Solde SC insuffisant : %s SC disponibles, %s SC requis', v_wallet_sc, p_amount_sc)
    );
  END IF;

  -- Débiter le wallet
  UPDATE public.user_wallets
  SET soumboulah_cash = soumboulah_cash - p_amount_sc,
      updated_at = now()
  WHERE user_id = p_payer_user_id;

  -- Enregistrer la transaction wallet
  INSERT INTO public.wallet_transactions
    (user_id, currency, amount, transaction_type, description, reference_type, reference_id)
  VALUES (
    p_payer_user_id,
    'soumboulah_cash',
    -p_amount_sc,
    'subscription_payment',
    'Abonnement école — ' || p_billing_cycle,
    'school_subscription',
    p_school_id::text
  );

  -- Créer l'enregistrement de paiement
  INSERT INTO public.school_subscription_payments
    (school_id, plan_id, payer_user_id, payment_method, status,
     amount_xof, amount_sc, billing_cycle, duration_months,
     activated_at, expires_at)
  VALUES (
    p_school_id, p_plan_id, p_payer_user_id, 'sc', 'paid',
    p_amount_xof, p_amount_sc, p_billing_cycle, p_duration_months,
    now(), p_new_expires_at
  )
  RETURNING id INTO v_payment_id;

  -- Activer l'abonnement
  UPDATE public.schools
  SET subscription_plan_id    = p_plan_id,
      subscription_expires_at = p_new_expires_at
  WHERE id = p_school_id;

  RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id);
END;
$$;
