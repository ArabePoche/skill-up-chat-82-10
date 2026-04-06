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
  v_sender_id UUID;
  v_sender_balance NUMERIC;
  v_commission_rate NUMERIC;
  v_commission NUMERIC;
  v_net_amount NUMERIC;
  v_sender_name TEXT;
  v_recipient_name TEXT;
  v_base_reason TEXT;
  v_sender_avatar TEXT;
  v_recipient_avatar TEXT;
  v_sender_desc TEXT;
  v_recipient_desc TEXT;
  v_live_stream_id UUID;
  v_live_title TEXT;
  v_is_live_gift BOOLEAN := FALSE;
  v_reference_type TEXT := 'transfer';
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

  IF p_reference_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    BEGIN
      v_live_stream_id := p_reference_id::UUID;
      SELECT title INTO v_live_title
      FROM public.user_live_streams
      WHERE id = v_live_stream_id;

      IF v_live_title IS NOT NULL THEN
        v_is_live_gift := TRUE;
        v_reference_type := 'live_stream';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_live_stream_id := NULL;
      v_live_title := NULL;
      v_is_live_gift := FALSE;
    END;
  END IF;

  SELECT soumboulah_cash INTO v_sender_balance
  FROM public.user_wallets
  WHERE user_id = v_sender_id;

  IF v_sender_balance IS NULL OR v_sender_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solde insuffisant');
  END IF;

  v_commission_rate := public.get_gift_commission_rate(p_recipient_id);
  v_commission := ROUND(p_amount * v_commission_rate, 8);
  v_net_amount := p_amount - v_commission;

  SELECT first_name || ' ' || last_name, avatar_url INTO v_sender_name, v_sender_avatar FROM profiles WHERE id = v_sender_id;
  SELECT first_name || ' ' || last_name, avatar_url INTO v_recipient_name, v_recipient_avatar FROM profiles WHERE id = p_recipient_id;

  v_sender_name := COALESCE(v_sender_name, 'Utilisateur');
  v_recipient_name := COALESCE(v_recipient_name, 'Utilisateur');

  IF p_reason = 'gift' OR p_reason IS NULL OR trim(p_reason) = '' THEN
    v_base_reason := CASE WHEN v_is_live_gift THEN 'Cadeau live' ELSE 'Cadeau' END;
  ELSE
    v_base_reason := p_reason;
  END IF;

  v_sender_desc := jsonb_build_object(
    'type', 'gift_transfer',
    'role', 'sender',
    'gift_reason', v_base_reason,
    'video_title', NULL,
    'source_type', CASE WHEN v_is_live_gift THEN 'live_stream' ELSE 'wallet' END,
    'live_stream_id', v_live_stream_id,
    'live_title', v_live_title,
    'partner_id', p_recipient_id,
    'partner_name', v_recipient_name,
    'partner_avatar', v_recipient_avatar
  )::text;

  v_recipient_desc := jsonb_build_object(
    'type', 'gift_transfer',
    'role', 'receiver',
    'gift_reason', v_base_reason,
    'video_title', NULL,
    'source_type', CASE WHEN v_is_live_gift THEN 'live_stream' ELSE 'wallet' END,
    'live_stream_id', v_live_stream_id,
    'live_title', v_live_title,
    'partner_id', v_sender_id,
    'partner_name', v_sender_name,
    'partner_avatar', v_sender_avatar
  )::text;

  UPDATE public.user_wallets
  SET soumboulah_cash = soumboulah_cash - p_amount,
      updated_at = now()
  WHERE user_id = v_sender_id;

  INSERT INTO public.user_wallets (user_id, habbah, soumboulah_cash, soumboulah_bonus)
  VALUES (p_recipient_id, 0, v_net_amount, 0)
  ON CONFLICT (user_id)
  DO UPDATE SET
    soumboulah_cash = user_wallets.soumboulah_cash + v_net_amount,
    updated_at = now();

  INSERT INTO public.wallet_transactions (
    user_id, currency, amount, transaction_type, description, reference_id, reference_type
  ) VALUES (
    v_sender_id, 'soumboulah_cash', -p_amount, 'gift_sent',
    v_sender_desc,
    p_reference_id, v_reference_type
  );

  INSERT INTO public.wallet_transactions (
    user_id, currency, amount, transaction_type, description, reference_id, reference_type
  ) VALUES (
    p_recipient_id, 'soumboulah_cash', v_net_amount, 'gift_received',
    v_recipient_desc,
    p_reference_id, v_reference_type
  );

  IF v_commission > 0 THEN
    INSERT INTO public.wallet_transactions (
      user_id, currency, amount, transaction_type, description, reference_id, reference_type
    ) VALUES (
      p_recipient_id, 'soumboulah_cash', -v_commission, 'commission',
      'Frais de plateforme (' || ROUND(v_commission_rate * 100, 0)::text || '%) sur le ' || LOWER(v_base_reason) || ' de ' || v_sender_name,
      p_reference_id, v_reference_type
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Transfert effectué',
    'net_amount', v_net_amount,
    'commission', v_commission,
    'commission_rate', v_commission_rate
  );
END;
$$;

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
  v_sender_id UUID;
  v_sender_balance NUMERIC;
  v_commission_rate NUMERIC;
  v_commission NUMERIC;
  v_net_amount NUMERIC;
  v_sender_name TEXT;
  v_recipient_name TEXT;
  v_base_reason TEXT;
  v_sender_avatar TEXT;
  v_recipient_avatar TEXT;
  v_sender_desc TEXT;
  v_recipient_desc TEXT;
  v_live_stream_id UUID;
  v_live_title TEXT;
  v_is_live_gift BOOLEAN := FALSE;
  v_reference_type TEXT := 'transfer';
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

  IF p_reference_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    BEGIN
      v_live_stream_id := p_reference_id::UUID;
      SELECT title INTO v_live_title
      FROM public.user_live_streams
      WHERE id = v_live_stream_id;

      IF v_live_title IS NOT NULL THEN
        v_is_live_gift := TRUE;
        v_reference_type := 'live_stream';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_live_stream_id := NULL;
      v_live_title := NULL;
      v_is_live_gift := FALSE;
    END;
  END IF;

  SELECT soumboulah_bonus INTO v_sender_balance
  FROM public.user_wallets
  WHERE user_id = v_sender_id;

  IF v_sender_balance IS NULL OR v_sender_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solde insuffisant');
  END IF;

  v_commission_rate := public.get_gift_commission_rate(p_recipient_id);
  v_commission := ROUND(p_amount * v_commission_rate, 8);
  v_net_amount := p_amount - v_commission;

  SELECT first_name || ' ' || last_name, avatar_url INTO v_sender_name, v_sender_avatar FROM profiles WHERE id = v_sender_id;
  SELECT first_name || ' ' || last_name, avatar_url INTO v_recipient_name, v_recipient_avatar FROM profiles WHERE id = p_recipient_id;

  v_sender_name := COALESCE(v_sender_name, 'Utilisateur');
  v_recipient_name := COALESCE(v_recipient_name, 'Utilisateur');

  IF p_reason = 'gift' OR p_reason IS NULL OR trim(p_reason) = '' THEN
    v_base_reason := CASE WHEN v_is_live_gift THEN 'Cadeau live' ELSE 'Cadeau' END;
  ELSE
    v_base_reason := p_reason;
  END IF;

  v_sender_desc := jsonb_build_object(
    'type', 'gift_transfer',
    'role', 'sender',
    'gift_reason', v_base_reason,
    'video_title', NULL,
    'source_type', CASE WHEN v_is_live_gift THEN 'live_stream' ELSE 'wallet' END,
    'live_stream_id', v_live_stream_id,
    'live_title', v_live_title,
    'partner_id', p_recipient_id,
    'partner_name', v_recipient_name,
    'partner_avatar', v_recipient_avatar
  )::text;

  v_recipient_desc := jsonb_build_object(
    'type', 'gift_transfer',
    'role', 'receiver',
    'gift_reason', v_base_reason,
    'video_title', NULL,
    'source_type', CASE WHEN v_is_live_gift THEN 'live_stream' ELSE 'wallet' END,
    'live_stream_id', v_live_stream_id,
    'live_title', v_live_title,
    'partner_id', v_sender_id,
    'partner_name', v_sender_name,
    'partner_avatar', v_sender_avatar
  )::text;

  UPDATE public.user_wallets
  SET soumboulah_bonus = soumboulah_bonus - p_amount,
      updated_at = now()
  WHERE user_id = v_sender_id;

  INSERT INTO public.user_wallets (user_id, habbah, soumboulah_cash, soumboulah_bonus)
  VALUES (p_recipient_id, 0, 0, v_net_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    soumboulah_bonus = user_wallets.soumboulah_bonus + v_net_amount,
    updated_at = now();

  INSERT INTO public.wallet_transactions (
    user_id, currency, amount, transaction_type, description, reference_id, reference_type
  ) VALUES (
    v_sender_id, 'soumboulah_bonus', -p_amount, 'gift_sent',
    v_sender_desc,
    p_reference_id, v_reference_type
  );

  INSERT INTO public.wallet_transactions (
    user_id, currency, amount, transaction_type, description, reference_id, reference_type
  ) VALUES (
    p_recipient_id, 'soumboulah_bonus', v_net_amount, 'gift_received',
    v_recipient_desc,
    p_reference_id, v_reference_type
  );

  IF v_commission > 0 THEN
    INSERT INTO public.wallet_transactions (
      user_id, currency, amount, transaction_type, description, reference_id, reference_type
    ) VALUES (
      p_recipient_id, 'soumboulah_bonus', -v_commission, 'commission',
      'Frais de plateforme (' || ROUND(v_commission_rate * 100, 0)::text || '%) sur le ' || LOWER(v_base_reason) || ' de ' || v_sender_name,
      p_reference_id, v_reference_type
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Transfert effectué',
    'net_amount', v_net_amount,
    'commission', v_commission,
    'commission_rate', v_commission_rate
  );
END;
$$;

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
  v_sender_id UUID;
  v_sender_balance NUMERIC;
  v_new_sender_balance NUMERIC;
  v_video_id UUID;
  v_video_title TEXT;
  v_description TEXT;
  v_commission_rate NUMERIC;
  v_commission NUMERIC;
  v_net_amount NUMERIC;
  v_sender_name TEXT;
  v_recipient_name TEXT;
  v_base_reason TEXT;
  v_sender_desc TEXT;
  v_recipient_desc TEXT;
  v_sender_avatar TEXT;
  v_recipient_avatar TEXT;
  v_live_stream_id UUID;
  v_live_title TEXT;
  v_is_live_gift BOOLEAN := FALSE;
  v_reference_type TEXT := 'transfer';
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

  v_live_stream_id := NULL;
  v_live_title := NULL;

  IF p_reference_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    BEGIN
      v_live_stream_id := p_reference_id::UUID;
      SELECT title INTO v_live_title
      FROM public.user_live_streams
      WHERE id = v_live_stream_id;

      IF v_live_title IS NOT NULL THEN
        v_is_live_gift := TRUE;
        v_reference_type := 'live_stream';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_live_stream_id := NULL;
      v_live_title := NULL;
      v_is_live_gift := FALSE;
    END;
  END IF;

  v_video_id := NULL;
  v_video_title := NULL;

  IF NOT v_is_live_gift AND p_reference_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    BEGIN
      v_video_id := p_reference_id::UUID;
      SELECT title INTO v_video_title FROM public.videos WHERE id = v_video_id;
    EXCEPTION WHEN OTHERS THEN
      v_video_title := NULL;
    END;
  END IF;

  IF v_is_live_gift THEN
    v_description := 'Cadeau pour le live : ' || COALESCE(v_live_title, 'Live');
  ELSIF v_video_title IS NOT NULL THEN
    v_description := 'Cadeau pour : ' || v_video_title;
  ELSE
    v_description := COALESCE(p_reason, 'Cadeau envoyé');
  END IF;

  SELECT first_name || ' ' || last_name, avatar_url INTO v_sender_name, v_sender_avatar FROM profiles WHERE id = v_sender_id;
  SELECT first_name || ' ' || last_name, avatar_url INTO v_recipient_name, v_recipient_avatar FROM profiles WHERE id = p_recipient_id;

  v_sender_name := COALESCE(v_sender_name, 'Utilisateur');
  v_recipient_name := COALESCE(v_recipient_name, 'Utilisateur');

  IF p_reason = 'gift' OR p_reason IS NULL OR trim(p_reason) = '' THEN
    v_base_reason := CASE WHEN v_is_live_gift THEN 'Cadeau live' ELSE 'Cadeau' END;
  ELSE
    v_base_reason := p_reason;
  END IF;

  v_sender_desc := jsonb_build_object(
    'type', 'gift_transfer',
    'role', 'sender',
    'gift_reason', v_base_reason,
    'video_title', v_video_title,
    'source_type', CASE WHEN v_is_live_gift THEN 'live_stream' ELSE 'wallet' END,
    'live_stream_id', v_live_stream_id,
    'live_title', v_live_title,
    'partner_id', p_recipient_id,
    'partner_name', v_recipient_name,
    'partner_avatar', v_recipient_avatar
  )::text;

  v_recipient_desc := jsonb_build_object(
    'type', 'gift_transfer',
    'role', 'receiver',
    'gift_reason', v_base_reason,
    'video_title', v_video_title,
    'source_type', CASE WHEN v_is_live_gift THEN 'live_stream' ELSE 'wallet' END,
    'live_stream_id', v_live_stream_id,
    'live_title', v_live_title,
    'partner_id', v_sender_id,
    'partner_name', v_sender_name,
    'partner_avatar', v_sender_avatar
  )::text;

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

  v_commission_rate := public.get_gift_commission_rate(p_recipient_id);
  v_commission := ROUND(p_amount * v_commission_rate, 8);
  v_net_amount := p_amount - v_commission;

  INSERT INTO habbah_events (
    user_id, habbah_earned, event_type, description, reference_id, related_user_id
  ) VALUES (
    v_sender_id, -p_amount, 'transfer_sent', v_sender_desc,
    p_recipient_id::text, p_recipient_id
  );

  INSERT INTO habbah_events (
    user_id, habbah_earned, event_type, description, reference_id, related_user_id
  ) VALUES (
    p_recipient_id, v_net_amount, 'transfer_received', v_recipient_desc,
    p_reference_id, v_sender_id
  );

  IF v_commission > 0 THEN
    INSERT INTO public.wallet_transactions (
      user_id, currency, amount, transaction_type, description, reference_id, reference_type
    ) VALUES (
      p_recipient_id, 'habbah', -v_commission, 'commission',
      'Frais de plateforme (' || ROUND(v_commission_rate * 100, 0)::text || '%) sur le ' || LOWER(v_base_reason) || ' de ' || v_sender_name,
      p_reference_id, v_reference_type
    );
  END IF;

  IF NOT v_is_live_gift THEN
    INSERT INTO notifications (
      user_id, sender_id, type, title, message, video_id, is_read
    ) VALUES (
      p_recipient_id, v_sender_id, 'gift_received',
      'Cadeau reçu !',
      'Vous avez reçu ' || v_net_amount || ' Habbah en cadeau !',
      v_video_id, false
    );
  END IF;

  SELECT habbah INTO v_new_sender_balance
  FROM user_wallets
  WHERE user_id = v_sender_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Transfert effectué avec succès',
    'new_balance', v_new_sender_balance,
    'net_amount', v_net_amount,
    'commission', v_commission,
    'commission_rate', v_commission_rate
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;