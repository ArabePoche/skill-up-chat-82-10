-- Update wallet_transactions constraint to allow gift_sent and gift_received
DO $$
BEGIN
    ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_transaction_type_check;
    ALTER TABLE public.wallet_transactions 
      ADD CONSTRAINT wallet_transactions_transaction_type_check 
      CHECK (transaction_type IN ('earn', 'spend', 'convert', 'gift', 'refund', 'purchase', 'topup', 'gift_sent', 'gift_received'));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- Function to transfer Soumboulah Cash
CREATE OR REPLACE FUNCTION public.transfer_soumboulah_cash(
  p_recipient_id UUID,
  p_amount NUMERIC,
  p_reason TEXT DEFAULT 'gift',
  p_reference_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_sender_balance NUMERIC;
BEGIN
  -- Get sender ID
  v_sender_id := auth.uid();
  
  -- Validation
  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Non authentifié');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Montant invalide');
  END IF;

  IF v_sender_id = p_recipient_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Auto-transfert non autorisé');
  END IF;

  -- Check balance
  SELECT soumboulah_cash INTO v_sender_balance
  FROM public.user_wallets
  WHERE user_id = v_sender_id;

  IF v_sender_balance IS NULL OR v_sender_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solde insuffisant');
  END IF;

  -- Perform transfer
  -- 1. Deduct from sender
  UPDATE public.user_wallets
  SET soumboulah_cash = soumboulah_cash - p_amount,
      updated_at = now()
  WHERE user_id = v_sender_id;

  -- 2. Add to recipient
  INSERT INTO public.user_wallets (user_id, habbah, soumboulah_cash, soumboulah_bonus)
  VALUES (p_recipient_id, 0, p_amount, 0)
  ON CONFLICT (user_id)
  DO UPDATE SET 
    soumboulah_cash = user_wallets.soumboulah_cash + p_amount,
    updated_at = now();

  -- 3. Log transactions
  -- Sender log
  INSERT INTO public.wallet_transactions (
    user_id,
    currency,
    amount,
    transaction_type,
    description,
    reference_id,
    reference_type
  ) VALUES (
    v_sender_id,
    'soumboulah_cash',
    -p_amount,
    'gift_sent',
    p_reason,
    p_reference_id,
    'transfer'
  );

  -- Recipient log
  INSERT INTO public.wallet_transactions (
    user_id,
    currency,
    amount,
    transaction_type,
    description,
    reference_id,
    reference_type
  ) VALUES (
    p_recipient_id,
    'soumboulah_cash',
    p_amount,
    'gift_received',
    p_reason,
    p_reference_id,
    'transfer'
  );

  RETURN jsonb_build_object('success', true, 'message', 'Transfert effectué');
END;
$$;

-- Function to transfer Soumboulah Bonus
CREATE OR REPLACE FUNCTION public.transfer_soumboulah_bonus(
  p_recipient_id UUID,
  p_amount NUMERIC,
  p_reason TEXT DEFAULT 'gift',
  p_reference_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_sender_balance NUMERIC;
BEGIN
  -- Get sender ID
  v_sender_id := auth.uid();
  
  -- Validation
  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Non authentifié');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Montant invalide');
  END IF;

  IF v_sender_id = p_recipient_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Auto-transfert non autorisé');
  END IF;

  -- Check balance
  SELECT soumboulah_bonus INTO v_sender_balance
  FROM public.user_wallets
  WHERE user_id = v_sender_id;

  IF v_sender_balance IS NULL OR v_sender_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solde insuffisant');
  END IF;

  -- Perform transfer
  -- 1. Deduct from sender
  UPDATE public.user_wallets
  SET soumboulah_bonus = soumboulah_bonus - p_amount,
      updated_at = now()
  WHERE user_id = v_sender_id;

  -- 2. Add to recipient
  INSERT INTO public.user_wallets (user_id, habbah, soumboulah_cash, soumboulah_bonus)
  VALUES (p_recipient_id, 0, 0, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET 
    soumboulah_bonus = user_wallets.soumboulah_bonus + p_amount,
    updated_at = now();

  -- 3. Log transactions
  -- Sender log
  INSERT INTO public.wallet_transactions (
    user_id,
    currency,
    amount,
    transaction_type,
    description,
    reference_id,
    reference_type
  ) VALUES (
    v_sender_id,
    'soumboulah_bonus',
    -p_amount,
    'gift_sent',
    p_reason,
    p_reference_id,
    'transfer'
  );

  -- Recipient log
  INSERT INTO public.wallet_transactions (
    user_id,
    currency,
    amount,
    transaction_type,
    description,
    reference_id,
    reference_type
  ) VALUES (
    p_recipient_id,
    'soumboulah_bonus',
    p_amount,
    'gift_received',
    p_reason,
    p_reference_id,
    'transfer'
  );

  RETURN jsonb_build_object('success', true, 'message', 'Transfert effectué');
END;
$$;
