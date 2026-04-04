-- Table des paiements d'abonnement école
-- Supporte deux modes : SC (soumboulah_cash) et Manuel (externe à la plateforme)

CREATE TABLE IF NOT EXISTS public.school_subscription_payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plan_id             uuid NOT NULL REFERENCES public.school_subscription_plans(id),
  payer_user_id       uuid NOT NULL REFERENCES auth.users(id),
  payment_method      text NOT NULL CHECK (payment_method IN ('sc', 'manual')),
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'paid', 'rejected', 'cancelled')),
  amount_xof          numeric(14, 2) NOT NULL,
  amount_sc           numeric(14, 4),             -- null pour paiement manuel
  billing_cycle       text NOT NULL DEFAULT 'monthly'
                        CHECK (billing_cycle IN ('monthly', 'yearly')),
  duration_months     int NOT NULL DEFAULT 1,     -- durée accordée en mois
  activated_at        timestamptz,                -- quand l'abonnement a été activé
  expires_at          timestamptz,                -- date d'expiration calculée
  admin_note          text,                       -- note de l'admin (validation manuelle)
  validated_by        uuid REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ssp_school_id ON public.school_subscription_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_ssp_status    ON public.school_subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_ssp_method    ON public.school_subscription_payments(payment_method);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_school_subscription_payments_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_ssp_updated_at ON public.school_subscription_payments;
CREATE TRIGGER trg_ssp_updated_at
  BEFORE UPDATE ON public.school_subscription_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_school_subscription_payments_updated_at();

-- RLS
ALTER TABLE public.school_subscription_payments ENABLE ROW LEVEL SECURITY;

-- École voit ses propres paiements
DROP POLICY IF EXISTS "ssp_select_own_school" ON public.school_subscription_payments;
CREATE POLICY "ssp_select_own_school"
  ON public.school_subscription_payments FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE owner_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seul le payeur (owner) peut créer une demande
DROP POLICY IF EXISTS "ssp_insert_owner" ON public.school_subscription_payments;
CREATE POLICY "ssp_insert_owner"
  ON public.school_subscription_payments FOR INSERT TO authenticated
  WITH CHECK (payer_user_id = auth.uid());

-- Seuls les admins peuvent UPDATE (valider/rejeter)
DROP POLICY IF EXISTS "ssp_update_admin" ON public.school_subscription_payments;
CREATE POLICY "ssp_update_admin"
  ON public.school_subscription_payments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ----------------------------------------------------------------
-- RPC : débiter les SC d'un utilisateur pour un abonnement école
-- Effectue la vérification du solde + débit atomique
-- ----------------------------------------------------------------
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
  -- Vérifier le solde
  SELECT soumboulah_cash INTO v_wallet_sc
  FROM public.user_wallets
  WHERE user_id = p_payer_user_id
  FOR UPDATE;

  IF v_wallet_sc IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Portefeuille introuvable');
  END IF;

  IF v_wallet_sc < p_amount_sc THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solde SC insuffisant');
  END IF;

  -- Débiter le wallet
  UPDATE public.user_wallets
  SET soumboulah_cash = soumboulah_cash - p_amount_sc,
      updated_at = now()
  WHERE user_id = p_payer_user_id;

  -- Enregistrer la transaction wallet
  INSERT INTO public.wallet_transactions (user_id, currency, amount, transaction_type, description, reference_type, reference_id)
  VALUES (
    p_payer_user_id,
    'soumboulah_cash',
    -p_amount_sc,
    'subscription_payment',
    'Abonnement école (plan)',
    'school_subscription',
    p_school_id::text
  );

  -- Créer l'enregistrement de paiement
  INSERT INTO public.school_subscription_payments
    (school_id, plan_id, payer_user_id, payment_method, status, amount_xof, amount_sc, billing_cycle, duration_months, activated_at, expires_at)
  VALUES
    (p_school_id, p_plan_id, p_payer_user_id, 'sc', 'paid', p_amount_xof, p_amount_sc, p_billing_cycle, p_duration_months, now(), p_new_expires_at)
  RETURNING id INTO v_payment_id;

  -- Activer l'abonnement sur l'école
  UPDATE public.schools
  SET subscription_plan_id  = p_plan_id,
      subscription_expires_at = p_new_expires_at
  WHERE id = p_school_id;

  RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id);
END;
$$;
