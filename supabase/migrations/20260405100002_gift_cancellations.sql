-- Migration: Gift cancellation claims

-- 1. Create gift cancellation claims table
CREATE TABLE IF NOT EXISTS public.gift_cancellation_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_ref TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  recipient_id UUID NOT NULL REFERENCES profiles(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('soumboulah_cash', 'soumboulah_bonus')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.gift_cancellation_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own claims"
  ON public.gift_cancellation_claims
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Admins can view and manage all claims"
  ON public.gift_cancellation_claims
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 2. Add blocked_balance columns to user_wallets
ALTER TABLE public.user_wallets ADD COLUMN IF NOT EXISTS blocked_cash NUMERIC DEFAULT 0;
ALTER TABLE public.user_wallets ADD COLUMN IF NOT EXISTS blocked_bonus NUMERIC DEFAULT 0;

-- 3. Trigger or RPC to create a claim and block funds
CREATE OR REPLACE FUNCTION public.create_gift_cancellation_claim(
  p_transaction_ref TEXT,
  p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_recipient_id UUID;
  v_amount NUMERIC;
  v_currency TEXT;
  v_claim_id UUID;
  v_recipient_balance NUMERIC;
BEGIN
  v_sender_id := auth.uid();
  
  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Non authentifié');
  END IF;

  -- Validate transaction
  SELECT user_id, amount, currency INTO v_recipient_id, v_amount, v_currency
  FROM public.wallet_transactions
  WHERE reference_id = p_transaction_ref AND transaction_type = 'gift_received' AND amount > 0
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Transaction non trouvée');
  END IF;

  -- Avoid duplicate claims
  IF EXISTS (SELECT 1 FROM public.gift_cancellation_claims WHERE transaction_ref = p_transaction_ref) THEN
      RETURN jsonb_build_object('success', false, 'message', 'Une réclamation existe déjà pour ce cadeau');
  END IF;
  
  -- Prevent if sender doesn't match the original transaction sender (verify via the sent part)
  IF NOT EXISTS (
     SELECT 1 FROM public.wallet_transactions
     WHERE reference_id = p_transaction_ref AND transaction_type = 'gift_sent' AND user_id = v_sender_id
  ) THEN
     RETURN jsonb_build_object('success', false, 'message', 'Transaction non autorisée');
  END IF;

  -- Check recipient balance
  IF v_currency = 'soumboulah_cash' THEN
    SELECT soumboulah_cash INTO v_recipient_balance FROM public.user_wallets WHERE user_id = v_recipient_id;
  ELSE
    SELECT soumboulah_bonus INTO v_recipient_balance FROM public.user_wallets WHERE user_id = v_recipient_id;
  END IF;

  IF v_recipient_balance < v_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solde du destinataire insuffisant pour bloquer les fonds');
  END IF;

  -- Create claim
  INSERT INTO public.gift_cancellation_claims (
    transaction_ref, sender_id, recipient_id, amount, currency, reason
  ) VALUES (
    p_transaction_ref, v_sender_id, v_recipient_id, v_amount, v_currency, p_reason
  ) RETURNING id INTO v_claim_id;

  -- Block funds
  IF v_currency = 'soumboulah_cash' THEN
    UPDATE public.user_wallets
    SET soumboulah_cash = soumboulah_cash - v_amount,
        blocked_cash = blocked_cash + v_amount,
        updated_at = now()
    WHERE user_id = v_recipient_id;
  ELSE
    UPDATE public.user_wallets
    SET soumboulah_bonus = soumboulah_bonus - v_amount,
        blocked_bonus = blocked_bonus + v_amount,
        updated_at = now()
    WHERE user_id = v_recipient_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Réclamation envoyée et fonds bloqués',
    'claim_id', v_claim_id
  );
END;
$$;


-- 4. RPC to resolve a claim (Approve or Reject)
CREATE OR REPLACE FUNCTION public.resolve_gift_cancellation_claim(
  p_claim_id UUID,
  p_action TEXT, -- 'approve' or 'reject'
  p_admin_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_claim RECORD;
  v_is_admin BOOLEAN;
BEGIN
  v_admin_id := auth.uid();
  
  -- Verify admin role
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = v_admin_id AND role = 'admin'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'message', 'Accès refusé');
  END IF;

  -- Get claim
  SELECT * INTO v_claim FROM public.gift_cancellation_claims WHERE id = p_claim_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Réclamation introuvable ou déjà traitée');
  END IF;
  
  IF p_action = 'approve' THEN
    -- Return funds to sender (Approve cancellation)
    -- Remove from blocked
    IF v_claim.currency = 'soumboulah_cash' THEN
      UPDATE public.user_wallets
      SET blocked_cash = blocked_cash - v_claim.amount,
          updated_at = now()
      WHERE user_id = v_claim.recipient_id;
      
      UPDATE public.user_wallets
      SET soumboulah_cash = soumboulah_cash + v_claim.amount,
          updated_at = now()
      WHERE user_id = v_claim.sender_id;
    ELSE
      UPDATE public.user_wallets
      SET blocked_bonus = blocked_bonus - v_claim.amount,
          updated_at = now()
      WHERE user_id = v_claim.recipient_id;
      
      UPDATE public.user_wallets
      SET soumboulah_bonus = soumboulah_bonus + v_claim.amount,
          updated_at = now()
      WHERE user_id = v_claim.sender_id;
    END IF;
    
    -- Record refund transaction for sender
    INSERT INTO public.wallet_transactions (
      user_id, currency, amount, transaction_type, description, reference_id, reference_type
    ) VALUES (
      v_claim.sender_id, v_claim.currency, v_claim.amount, 'refund', 
      'Remboursement suite à l''annulation du cadeau', 
      v_claim.transaction_ref, 'refund'
    );
    
    -- Update claim status
    UPDATE public.gift_cancellation_claims
    SET status = 'approved',
        admin_notes = p_admin_notes,
        resolved_by = v_admin_id,
        resolved_at = now()
    WHERE id = p_claim_id;

    RETURN jsonb_build_object('success', true, 'message', 'Réclamation approuvée, fonds restitués.');

  ELSIF p_action = 'reject' THEN
    -- Unblock funds and give them back to recipient (Reject cancellation)
    IF v_claim.currency = 'soumboulah_cash' THEN
      UPDATE public.user_wallets
      SET blocked_cash = blocked_cash - v_claim.amount,
          soumboulah_cash = soumboulah_cash + v_claim.amount,
          updated_at = now()
      WHERE user_id = v_claim.recipient_id;
    ELSE
      UPDATE public.user_wallets
      SET blocked_bonus = blocked_bonus - v_claim.amount,
          soumboulah_bonus = soumboulah_bonus + v_claim.amount,
          updated_at = now()
      WHERE user_id = v_claim.recipient_id;
    END IF;

    -- Update claim status
    UPDATE public.gift_cancellation_claims
    SET status = 'rejected',
        admin_notes = p_admin_notes,
        resolved_by = v_admin_id,
        resolved_at = now()
    WHERE id = p_claim_id;

    RETURN jsonb_build_object('success', true, 'message', 'Réclamation rejetée, fonds débloqués.');
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Action invalide');
  END IF;
END;
$$;
