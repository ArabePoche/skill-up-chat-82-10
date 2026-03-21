-- Portefeuille utilisateur multi-devises (Soumboulah Cash, Soumboulah Bonus, Habbah)
CREATE TABLE public.user_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  soumboulah_cash numeric DEFAULT 0 NOT NULL,
  soumboulah_bonus numeric DEFAULT 0 NOT NULL,
  habbah numeric DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON public.user_wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
  ON public.user_wallets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert wallets"
  ON public.user_wallets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Transactions du portefeuille
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  currency text NOT NULL CHECK (currency IN ('soumboulah_cash', 'soumboulah_bonus', 'habbah')),
  amount numeric NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'convert', 'gift', 'refund', 'purchase', 'topup')),
  description text,
  reference_id text,
  reference_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.wallet_transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Événements Habbah (engagement: like, comment, share, daily login)
CREATE TABLE public.habbah_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('like', 'comment', 'share', 'daily_login', 'other')),
  habbah_earned numeric NOT NULL DEFAULT 1,
  reference_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.habbah_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habbah events"
  ON public.habbah_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habbah events"
  ON public.habbah_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fonction pour convertir Habbah en Soumboulah Bonus (100 H = 1 SB)
CREATE OR REPLACE FUNCTION public.convert_habbah_to_bonus(p_user_id uuid, p_habbah_amount numeric)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet user_wallets%ROWTYPE;
  v_sb_amount numeric;
BEGIN
  IF p_habbah_amount < 100 OR p_habbah_amount % 100 != 0 THEN
    RETURN json_build_object('success', false, 'error', 'Le montant doit être un multiple de 100');
  END IF;

  v_sb_amount := p_habbah_amount / 100;

  SELECT * INTO v_wallet FROM user_wallets WHERE user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Portefeuille introuvable');
  END IF;

  IF v_wallet.habbah < p_habbah_amount THEN
    RETURN json_build_object('success', false, 'error', 'Solde Habbah insuffisant');
  END IF;

  UPDATE user_wallets 
  SET habbah = habbah - p_habbah_amount,
      soumboulah_bonus = soumboulah_bonus + v_sb_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO wallet_transactions (user_id, currency, amount, transaction_type, description)
  VALUES (p_user_id, 'habbah', -p_habbah_amount, 'convert', 'Conversion en Soumboulah Bonus');

  INSERT INTO wallet_transactions (user_id, currency, amount, transaction_type, description)
  VALUES (p_user_id, 'soumboulah_bonus', v_sb_amount, 'convert', 'Conversion depuis Habbah');

  RETURN json_build_object('success', true, 'sb_earned', v_sb_amount);
END;
$$;

-- Auto-créer le wallet à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_wallet();