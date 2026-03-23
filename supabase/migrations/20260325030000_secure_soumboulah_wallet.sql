-- Secure Soumboulah Wallet System
-- Revoke direct permissions on user_wallets and wallet_transactions
-- All modifications must happen via secure RPC functions or triggers.

-- Remove the ability for users to update their own wallet balance directly
DROP POLICY IF EXISTS "Users can update own wallet" ON public.user_wallets;

-- Remove the ability for users to insert their own transaction history
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.wallet_transactions;

-- Secure the conversion function to prevent ID spoofing
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
  -- Strict identity check: users can only convert for themselves
  IF auth.uid() IS NULL OR p_user_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Action non autorisée');
  END IF;

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
