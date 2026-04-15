
CREATE OR REPLACE FUNCTION public.purchase_school_template(
  p_school_id UUID,
  p_template_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price NUMERIC;
  v_user_id UUID;
  v_balance NUMERIC;
  v_already_purchased BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT price_sc INTO v_price
  FROM school_site_templates
  WHERE id = p_template_id AND is_active = true;

  IF v_price IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'template_not_found');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM school_template_purchases
    WHERE school_id = p_school_id AND template_id = p_template_id
  ) INTO v_already_purchased;

  IF v_already_purchased THEN
    UPDATE schools SET site_template_id = p_template_id WHERE id = p_school_id;
    RETURN jsonb_build_object('success', true, 'already_owned', true);
  END IF;

  IF v_price <= 0 THEN
    INSERT INTO school_template_purchases (school_id, template_id, price_paid, purchased_by)
    VALUES (p_school_id, p_template_id, 0, v_user_id);
    UPDATE schools SET site_template_id = p_template_id WHERE id = p_school_id;
    RETURN jsonb_build_object('success', true, 'price_paid', 0);
  END IF;

  -- Read balance from user_wallets
  SELECT COALESCE(soumboulah_cash, 0) INTO v_balance
  FROM user_wallets
  WHERE user_id = v_user_id;

  IF v_balance IS NULL OR v_balance < v_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance', 'required', v_price, 'available', COALESCE(v_balance, 0));
  END IF;

  -- Deduct from user_wallets
  UPDATE user_wallets
  SET soumboulah_cash = soumboulah_cash - v_price
  WHERE user_id = v_user_id;

  INSERT INTO school_template_purchases (school_id, template_id, price_paid, purchased_by)
  VALUES (p_school_id, p_template_id, v_price, v_user_id);

  UPDATE schools SET site_template_id = p_template_id WHERE id = p_school_id;

  RETURN jsonb_build_object('success', true, 'price_paid', v_price);
END;
$$;
