
-- Table des achats de templates
CREATE TABLE public.school_template_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.school_site_templates(id) ON DELETE CASCADE,
  price_paid NUMERIC NOT NULL DEFAULT 0,
  purchased_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, template_id)
);

ALTER TABLE public.school_template_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their school purchases"
  ON public.school_template_purchases FOR SELECT
  TO authenticated
  USING (purchased_by = auth.uid());

CREATE POLICY "Users can insert purchases via function"
  ON public.school_template_purchases FOR INSERT
  TO authenticated
  WITH CHECK (purchased_by = auth.uid());

-- Fonction atomique d'achat + application de template
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

  -- Get template price
  SELECT price_sc INTO v_price
  FROM school_site_templates
  WHERE id = p_template_id AND is_active = true;

  IF v_price IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'template_not_found');
  END IF;

  -- Check if already purchased
  SELECT EXISTS(
    SELECT 1 FROM school_template_purchases
    WHERE school_id = p_school_id AND template_id = p_template_id
  ) INTO v_already_purchased;

  IF v_already_purchased THEN
    -- Already purchased, just apply
    UPDATE schools SET site_template_id = p_template_id WHERE id = p_school_id;
    RETURN jsonb_build_object('success', true, 'already_owned', true);
  END IF;

  -- If free, skip balance check
  IF v_price <= 0 THEN
    INSERT INTO school_template_purchases (school_id, template_id, price_paid, purchased_by)
    VALUES (p_school_id, p_template_id, 0, v_user_id);
    
    UPDATE schools SET site_template_id = p_template_id WHERE id = p_school_id;
    RETURN jsonb_build_object('success', true, 'price_paid', 0);
  END IF;

  -- Check SC balance
  SELECT COALESCE(balance_sc, 0) INTO v_balance
  FROM profiles
  WHERE id = v_user_id;

  IF v_balance < v_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance', 'required', v_price, 'available', v_balance);
  END IF;

  -- Deduct balance
  UPDATE profiles
  SET balance_sc = balance_sc - v_price
  WHERE id = v_user_id;

  -- Record purchase
  INSERT INTO school_template_purchases (school_id, template_id, price_paid, purchased_by)
  VALUES (p_school_id, p_template_id, v_price, v_user_id);

  -- Apply template
  UPDATE schools SET site_template_id = p_template_id WHERE id = p_school_id;

  RETURN jsonb_build_object('success', true, 'price_paid', v_price);
END;
$$;
