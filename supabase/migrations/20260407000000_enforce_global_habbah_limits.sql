-- Fix: enforce global Habbah limits (max_habbah_per_day / max_habbah_per_month)
-- that are configured by administrators in currency_global_limits.
-- The previous version of earn_habbah only checked per-action limits and ignored
-- the cross-action global caps entirely.

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
  v_user_id          uuid := auth.uid();
  v_rule             record;
  v_global_limits    record;
  v_last_event_time  timestamptz;
  v_daily_count      integer;
  v_monthly_count    integer;
  v_global_day_sum   integer;
  v_global_month_sum integer;
BEGIN
  -- 0. Authentication check
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- 1. Load the per-action rule
  SELECT * INTO v_rule
  FROM public.habbah_earning_rules
  WHERE action_type = p_action_type
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Rule not found or inactive');
  END IF;

  -- 2. Per-action cooldown
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

  -- 3. Per-action daily limit
  SELECT count(*) INTO v_daily_count
  FROM public.habbah_events
  WHERE user_id = v_user_id
    AND event_type = p_action_type
    AND habbah_earned > 0
    AND created_at >= date_trunc('day', now());

  IF v_daily_count >= v_rule.daily_limit THEN
    RETURN json_build_object('success', false, 'message', 'Daily limit reached');
  END IF;

  -- 4. Per-action monthly limit
  SELECT count(*) INTO v_monthly_count
  FROM public.habbah_events
  WHERE user_id = v_user_id
    AND event_type = p_action_type
    AND habbah_earned > 0
    AND created_at >= date_trunc('month', now());

  IF v_monthly_count >= v_rule.monthly_limit THEN
    RETURN json_build_object('success', false, 'message', 'Monthly limit reached');
  END IF;

  -- 5. Global daily limit (sum across ALL action types)
  SELECT * INTO v_global_limits
  FROM public.currency_global_limits
  LIMIT 1;

  IF FOUND AND v_global_limits.max_habbah_per_day > 0 THEN
    SELECT COALESCE(SUM(habbah_earned), 0) INTO v_global_day_sum
    FROM public.habbah_events
    WHERE user_id = v_user_id
      AND habbah_earned > 0
      AND created_at >= date_trunc('day', now());

    IF v_global_day_sum + v_rule.habbah_amount > v_global_limits.max_habbah_per_day THEN
      RETURN json_build_object('success', false, 'message', 'Global daily Habbah limit reached');
    END IF;
  END IF;

  -- 6. Global monthly limit (sum across ALL action types)
  IF FOUND AND v_global_limits.max_habbah_per_month > 0 THEN
    SELECT COALESCE(SUM(habbah_earned), 0) INTO v_global_month_sum
    FROM public.habbah_events
    WHERE user_id = v_user_id
      AND habbah_earned > 0
      AND created_at >= date_trunc('month', now());

    IF v_global_month_sum + v_rule.habbah_amount > v_global_limits.max_habbah_per_month THEN
      RETURN json_build_object('success', false, 'message', 'Global monthly Habbah limit reached');
    END IF;
  END IF;

  -- 7. Insert event (trigger handle_habbah_gain updates the wallet)
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
