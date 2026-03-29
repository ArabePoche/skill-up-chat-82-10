-- ============================================================
-- Commission sur les cadeaux reçus selon le niveau utilisateur
-- Explorer (0) et Bronze (1) et Silver (2) : 50%
-- Gold (3) : 40%
-- Diamond (4) : 30%
-- ============================================================

-- 1. Étendre les types de transaction autorisés pour inclure 'commission'
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_transaction_type_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_transaction_type_check
  CHECK (transaction_type IN (
    'earn', 'spend', 'convert', 'gift', 'refund', 'purchase', 'topup',
    'gift_sent', 'gift_received', 'commission'
  ));

-- 2. Table de configuration des commissions par niveau
CREATE TABLE IF NOT EXISTS public.gift_commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number INTEGER NOT NULL UNIQUE,
  level_name TEXT NOT NULL,
  level_badge TEXT NOT NULL DEFAULT '',
  commission_rate NUMERIC NOT NULL DEFAULT 0.50
    CHECK (commission_rate >= 0 AND commission_rate <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.gift_commission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tous peuvent voir les commissions"
  ON public.gift_commission_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Seuls les admins peuvent modifier les commissions"
  ON public.gift_commission_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Trigger updated_at
CREATE TRIGGER update_gift_commission_settings_updated_at
  BEFORE UPDATE ON public.gift_commission_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Taux par défaut
INSERT INTO public.gift_commission_settings (level_number, level_name, level_badge, commission_rate)
VALUES
  (0, 'Explorer', '🔰', 0.50),
  (1, 'Bronze',   '🥉', 0.50),
  (2, 'Silver',   '🥈', 0.50),
  (3, 'Gold',     '🥇', 0.40),
  (4, 'Diamond',  '💎', 0.30)
ON CONFLICT (level_number) DO NOTHING;

-- 4. Fonction utilitaire : retourne le taux de commission d'un destinataire
CREATE OR REPLACE FUNCTION public.get_gift_commission_rate(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_level  INTEGER;
  v_rate   NUMERIC;
BEGIN
  -- Récupérer le niveau de streak de l'utilisateur
  SELECT current_level INTO v_level
  FROM user_streaks
  WHERE user_id = p_user_id;

  -- Par défaut : Explorer (niveau 0)
  IF v_level IS NULL THEN
    v_level := 0;
  END IF;

  -- Lire le taux de commission correspondant
  SELECT commission_rate INTO v_rate
  FROM gift_commission_settings
  WHERE level_number = v_level;

  -- Sécurité : si la configuration est manquante, appliquer 50 %
  IF v_rate IS NULL THEN
    v_rate := 0.50;
  END IF;

  RETURN v_rate;
END;
$$;

-- 5. Réécriture de transfer_soumboulah_cash avec commission
CREATE OR REPLACE FUNCTION public.transfer_soumboulah_cash(
  p_recipient_id UUID,
  p_amount       NUMERIC,
  p_reason       TEXT    DEFAULT 'gift',
  p_reference_id TEXT    DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id       UUID;
  v_sender_balance  NUMERIC;
  v_commission_rate NUMERIC;
  v_commission      NUMERIC;
  v_net_amount      NUMERIC;
BEGIN
  v_sender_id := auth.uid();

  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Non authentifié');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Montant invalide');
  END IF;

  IF v_sender_id = p_recipient_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Auto-transfert non autorisé');
  END IF;

  -- Vérifier le solde de l'expéditeur
  SELECT soumboulah_cash INTO v_sender_balance
  FROM public.user_wallets
  WHERE user_id = v_sender_id;

  IF v_sender_balance IS NULL OR v_sender_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solde insuffisant');
  END IF;

  -- Calculer la commission selon le niveau du destinataire
  v_commission_rate := public.get_gift_commission_rate(p_recipient_id);
  v_commission      := ROUND(p_amount * v_commission_rate, 8);
  v_net_amount      := p_amount - v_commission;

  -- 1. Déduire la totalité du compte expéditeur
  UPDATE public.user_wallets
  SET soumboulah_cash = soumboulah_cash - p_amount,
      updated_at = now()
  WHERE user_id = v_sender_id;

  -- 2. Créditer uniquement le montant net au destinataire
  INSERT INTO public.user_wallets (user_id, habbah, soumboulah_cash, soumboulah_bonus)
  VALUES (p_recipient_id, 0, v_net_amount, 0)
  ON CONFLICT (user_id)
  DO UPDATE SET
    soumboulah_cash = user_wallets.soumboulah_cash + v_net_amount,
    updated_at = now();

  -- 3. Historique : envoi
  INSERT INTO public.wallet_transactions (
    user_id, currency, amount, transaction_type, description, reference_id, reference_type
  ) VALUES (
    v_sender_id, 'soumboulah_cash', -p_amount, 'gift_sent', p_reason, p_reference_id, 'transfer'
  );

  -- 4. Historique : réception (montant net)
  INSERT INTO public.wallet_transactions (
    user_id, currency, amount, transaction_type, description, reference_id, reference_type
  ) VALUES (
    p_recipient_id, 'soumboulah_cash', v_net_amount, 'gift_received', p_reason, p_reference_id, 'transfer'
  );

  -- 5. Historique : commission prélevée
  IF v_commission > 0 THEN
    INSERT INTO public.wallet_transactions (
      user_id, currency, amount, transaction_type, description, reference_id, reference_type
    ) VALUES (
      p_recipient_id, 'soumboulah_cash', -v_commission, 'commission',
      'Commission plateforme (' || ROUND(v_commission_rate * 100, 0)::integer || '%)',
      p_reference_id, 'transfer'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Transfert effectué',
    'net_amount', v_net_amount,
    'commission', v_commission
  );
END;
$$;

-- 6. Réécriture de transfer_soumboulah_bonus avec commission
CREATE OR REPLACE FUNCTION public.transfer_soumboulah_bonus(
  p_recipient_id UUID,
  p_amount       NUMERIC,
  p_reason       TEXT    DEFAULT 'gift',
  p_reference_id TEXT    DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id       UUID;
  v_sender_balance  NUMERIC;
  v_commission_rate NUMERIC;
  v_commission      NUMERIC;
  v_net_amount      NUMERIC;
BEGIN
  v_sender_id := auth.uid();

  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Non authentifié');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Montant invalide');
  END IF;

  IF v_sender_id = p_recipient_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Auto-transfert non autorisé');
  END IF;

  -- Vérifier le solde de l'expéditeur
  SELECT soumboulah_bonus INTO v_sender_balance
  FROM public.user_wallets
  WHERE user_id = v_sender_id;

  IF v_sender_balance IS NULL OR v_sender_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solde insuffisant');
  END IF;

  -- Calculer la commission selon le niveau du destinataire
  v_commission_rate := public.get_gift_commission_rate(p_recipient_id);
  v_commission      := ROUND(p_amount * v_commission_rate, 8);
  v_net_amount      := p_amount - v_commission;

  -- 1. Déduire la totalité du compte expéditeur
  UPDATE public.user_wallets
  SET soumboulah_bonus = soumboulah_bonus - p_amount,
      updated_at = now()
  WHERE user_id = v_sender_id;

  -- 2. Créditer uniquement le montant net au destinataire
  INSERT INTO public.user_wallets (user_id, habbah, soumboulah_cash, soumboulah_bonus)
  VALUES (p_recipient_id, 0, 0, v_net_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    soumboulah_bonus = user_wallets.soumboulah_bonus + v_net_amount,
    updated_at = now();

  -- 3. Historique : envoi
  INSERT INTO public.wallet_transactions (
    user_id, currency, amount, transaction_type, description, reference_id, reference_type
  ) VALUES (
    v_sender_id, 'soumboulah_bonus', -p_amount, 'gift_sent', p_reason, p_reference_id, 'transfer'
  );

  -- 4. Historique : réception (montant net)
  INSERT INTO public.wallet_transactions (
    user_id, currency, amount, transaction_type, description, reference_id, reference_type
  ) VALUES (
    p_recipient_id, 'soumboulah_bonus', v_net_amount, 'gift_received', p_reason, p_reference_id, 'transfer'
  );

  -- 5. Historique : commission prélevée
  IF v_commission > 0 THEN
    INSERT INTO public.wallet_transactions (
      user_id, currency, amount, transaction_type, description, reference_id, reference_type
    ) VALUES (
      p_recipient_id, 'soumboulah_bonus', -v_commission, 'commission',
      'Commission plateforme (' || ROUND(v_commission_rate * 100, 0)::integer || '%)',
      p_reference_id, 'transfer'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Transfert effectué',
    'net_amount', v_net_amount,
    'commission', v_commission
  );
END;
$$;

-- 7. Réécriture de transfer_habbah avec commission
--    (le trigger handle_habbah_gain s'appuie sur habbah_earned pour créditer le wallet)
CREATE OR REPLACE FUNCTION public.transfer_habbah(
  p_recipient_id UUID,
  p_amount       NUMERIC,
  p_reason       TEXT    DEFAULT 'gift',
  p_reference_id TEXT    DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id           UUID;
  v_sender_balance      NUMERIC;
  v_new_sender_balance  NUMERIC;
  v_video_id            UUID;
  v_video_title         TEXT;
  v_description         TEXT;
  v_commission_rate     NUMERIC;
  v_commission          NUMERIC;
  v_net_amount          NUMERIC;
BEGIN
  v_sender_id := auth.uid();

  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Non authentifié');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Montant invalide');
  END IF;

  IF v_sender_id = p_recipient_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Vous ne pouvez pas vous envoyer de l''argent à vous-même');
  END IF;

  -- Résoudre le titre de la vidéo si reference_id est un UUID
  v_video_id    := NULL;
  v_video_title := NULL;

  IF p_reference_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    BEGIN
      v_video_id := p_reference_id::UUID;
      SELECT title INTO v_video_title FROM public.videos WHERE id = v_video_id;
    EXCEPTION WHEN OTHERS THEN
      v_video_title := NULL;
    END;
  END IF;

  IF v_video_title IS NOT NULL THEN
    v_description := 'Cadeau pour : ' || v_video_title;
  ELSE
    v_description := COALESCE(p_reason, 'Cadeau envoyé');
  END IF;

  -- Vérifier le solde de l'expéditeur
  SELECT habbah INTO v_sender_balance
  FROM user_wallets
  WHERE user_id = v_sender_id;

  IF v_sender_balance IS NULL THEN
    INSERT INTO user_wallets (user_id, habbah)
    VALUES (v_sender_id, 0)
    RETURNING habbah INTO v_sender_balance;
  END IF;

  IF v_sender_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solde insuffisant');
  END IF;

  -- Calculer la commission selon le niveau du destinataire
  v_commission_rate := public.get_gift_commission_rate(p_recipient_id);
  v_commission      := ROUND(p_amount * v_commission_rate, 8);
  v_net_amount      := p_amount - v_commission;

  -- Débit expéditeur (montant complet)
  INSERT INTO habbah_events (
    user_id, habbah_earned, event_type, description, reference_id, related_user_id
  ) VALUES (
    v_sender_id, -p_amount, 'transfer_sent', v_description,
    p_recipient_id::text, p_recipient_id
  );

  -- Crédit destinataire (montant net seulement)
  INSERT INTO habbah_events (
    user_id, habbah_earned, event_type, description, reference_id, related_user_id
  ) VALUES (
    p_recipient_id, v_net_amount, 'transfer_received', v_description,
    p_reference_id, v_sender_id
  );

  -- Historique de la commission (directement dans wallet_transactions, sans trigger)
  IF v_commission > 0 THEN
    INSERT INTO public.wallet_transactions (
      user_id, currency, amount, transaction_type, description, reference_id, reference_type
    ) VALUES (
      p_recipient_id, 'habbah', -v_commission, 'commission',
      'Commission plateforme (' || ROUND(v_commission_rate * 100, 0)::integer || '%)',
      p_reference_id, 'transfer'
    );
  END IF;

  -- Notification au destinataire
  INSERT INTO notifications (
    user_id, sender_id, type, title, message, video_id, is_read
  ) VALUES (
    p_recipient_id, v_sender_id, 'gift_received',
    'Cadeau reçu !',
    'Vous avez reçu ' || v_net_amount || ' Habbah en cadeau !',
    v_video_id, false
  );

  -- Retourner le nouveau solde de l'expéditeur
  SELECT habbah INTO v_new_sender_balance
  FROM user_wallets
  WHERE user_id = v_sender_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Transfert effectué avec succès',
    'new_balance', v_new_sender_balance,
    'net_amount', v_net_amount,
    'commission', v_commission
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;
