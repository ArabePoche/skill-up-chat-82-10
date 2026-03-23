-- Create a secure function to handle Habbah earnings
CREATE OR REPLACE FUNCTION public.earn_habbah(
  p_action_type text,
  p_reference_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (bypass RLS)
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_rule record;
  v_last_event_time timestamptz;
  v_daily_count integer;
BEGIN
  -- 0. Check authentication
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- 1. Get the rule
  SELECT * INTO v_rule FROM habbah_earning_rules 
  WHERE action_type = p_action_type AND is_active = true;

  IF NOT FOUND THEN
    -- Rule doesn't exist or is inactive
    RETURN json_build_object('success', false, 'message', 'Rule not found or inactive');
  END IF;

  -- 2. Check Cooldown
  IF v_rule.cooldown_seconds > 0 THEN
    SELECT created_at INTO v_last_event_time FROM habbah_events
    WHERE user_id = v_user_id AND event_type = p_action_type
    ORDER BY created_at DESC LIMIT 1;
    
    IF v_last_event_time IS NOT NULL AND 
       v_last_event_time > (now() - (v_rule.cooldown_seconds || ' seconds')::interval) THEN
       -- Cooldown active
      RETURN json_build_object('success', false, 'message', 'Cooldown active');
    END IF;
  END IF;

  -- 3. Check Daily Limit
  SELECT count(*) INTO v_daily_count FROM habbah_events
  WHERE user_id = v_user_id 
    AND event_type = p_action_type
    AND created_at >= current_date;

  IF v_daily_count >= v_rule.daily_limit THEN
    -- Limit reached
    RETURN json_build_object('success', false, 'message', 'Daily limit reached');
  END IF;

  -- 4. Insert Event (The existing trigger 'on_habbah_event_insert' will handle wallet update)
  INSERT INTO habbah_events (user_id, event_type, habbah_earned, reference_id)
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

-- Revoke direct insert permission to secure the system
-- Users must use the earn_habbah function now
DROP POLICY IF EXISTS "Users can insert own habbah events" ON public.habbah_events;
