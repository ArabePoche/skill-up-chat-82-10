-- Make Habbah task rewards reversible so undoing an action removes the gain.

CREATE OR REPLACE FUNCTION public.earn_habbah(
  p_action_type text,
  p_reference_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_rule record;
  v_last_event_time timestamptz;
  v_daily_count integer;
  v_monthly_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  SELECT * INTO v_rule
  FROM public.habbah_earning_rules
  WHERE action_type = p_action_type
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Rule not found or inactive');
  END IF;

  IF v_rule.cooldown_seconds > 0 THEN
    SELECT created_at INTO v_last_event_time
    FROM public.habbah_events
    WHERE user_id = v_user_id
      AND event_type = p_action_type
      AND habbah_earned > 0
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_last_event_time IS NOT NULL
       AND v_last_event_time > (now() - (v_rule.cooldown_seconds || ' seconds')::interval) THEN
      RETURN json_build_object('success', false, 'message', 'Cooldown active');
    END IF;
  END IF;

  SELECT count(*) INTO v_daily_count
  FROM public.habbah_events
  WHERE user_id = v_user_id
    AND event_type = p_action_type
    AND habbah_earned > 0
    AND created_at >= date_trunc('day', now());

  IF v_daily_count >= v_rule.daily_limit THEN
    RETURN json_build_object('success', false, 'message', 'Daily limit reached');
  END IF;

  SELECT count(*) INTO v_monthly_count
  FROM public.habbah_events
  WHERE user_id = v_user_id
    AND event_type = p_action_type
    AND habbah_earned > 0
    AND created_at >= date_trunc('month', now());

  IF v_monthly_count >= v_rule.monthly_limit THEN
    RETURN json_build_object('success', false, 'message', 'Monthly limit reached');
  END IF;

  INSERT INTO public.habbah_events (user_id, event_type, habbah_earned, reference_id)
  VALUES (v_user_id, p_action_type, v_rule.habbah_amount, p_reference_id);

  RETURN json_build_object(
    'success', true,
    'amount', v_rule.habbah_amount,
    'label', v_rule.action_label
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_habbah_gain(
  p_action_type text,
  p_reference_id text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_original public.habbah_events%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  SELECT original.* INTO v_original
  FROM public.habbah_events AS original
  WHERE original.user_id = v_user_id
    AND original.event_type = p_action_type
    AND original.habbah_earned > 0
    AND (
      (p_reference_id IS NULL AND original.reference_id IS NULL)
      OR original.reference_id = p_reference_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.habbah_events AS reversal
      WHERE reversal.user_id = v_user_id
        AND reversal.habbah_earned < 0
        AND reversal.reference_id = original.id::text
        AND reversal.description LIKE 'REVERSAL:%'
    )
  ORDER BY original.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'No active reward found');
  END IF;

  INSERT INTO public.habbah_events (
    user_id,
    event_type,
    habbah_earned,
    reference_id,
    description
  )
  VALUES (
    v_user_id,
    p_action_type || '_reversal',
    -ABS(v_original.habbah_earned),
    v_original.id::text,
    'REVERSAL:' || COALESCE(p_reason, p_action_type)
  );

  RETURN json_build_object(
    'success', true,
    'amount', ABS(v_original.habbah_earned),
    'label', 'Retrait ' || p_action_type
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;