-- Fonction pour mettre à jour daily_minutes et current_streak dans user_streaks
CREATE OR REPLACE FUNCTION update_user_streak_daily_minutes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record RECORD;
  v_today DATE := CURRENT_DATE;
  v_minutes_today INTEGER;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_last_activity DATE;
BEGIN
  -- Parcourir tous les utilisateurs ayant un streak
  FOR v_user_record IN 
    SELECT user_id, last_activity_date, current_streak 
    FROM user_streaks
  LOOP
    -- Calculer les minutes d'aujourd'hui depuis user_activity_sessions
    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60), 0)::INTEGER
    INTO v_minutes_today
    FROM user_activity_sessions
    WHERE user_id = v_user_record.user_id 
      AND DATE(started_at) = v_today
      AND ended_at IS NOT NULL;

    -- Récupérer la dernière activité
    v_last_activity := v_user_record.last_activity_date;

    -- Logique de streak : si pas d'activité hier, décrémenter
    IF v_last_activity IS NOT NULL AND v_last_activity < v_yesterday THEN
      UPDATE user_streaks
      SET current_streak = GREATEST(0, current_streak - 1),
          updated_at = NOW()
      WHERE user_id = v_user_record.user_id;
    END IF;

    -- Si l'utilisateur a été actif aujourd'hui ET qu'il était actif hier, incrémenter le streak
    IF v_minutes_today >= 5 AND v_last_activity = v_yesterday THEN
      UPDATE user_streaks
      SET current_streak = current_streak + 1,
          longest_streak = GREATEST(longest_streak, current_streak + 1),
          total_days_active = total_days_active + 1,
          last_activity_date = v_today,
          daily_minutes = v_minutes_today,
          updated_at = NOW()
      WHERE user_id = v_user_record.user_id;
    
    -- Si c'est le premier jour d'activité (pas d'activité hier mais actif aujourd'hui)
    ELSIF v_minutes_today >= 5 AND (v_last_activity IS NULL OR v_last_activity < v_yesterday) THEN
      UPDATE user_streaks
      SET current_streak = 1,
          last_activity_date = v_today,
          daily_minutes = v_minutes_today,
          updated_at = NOW()
      WHERE user_id = v_user_record.user_id;
    
    -- Juste mettre à jour les minutes si déjà actif aujourd'hui
    ELSIF v_last_activity = v_today THEN
      UPDATE user_streaks
      SET daily_minutes = v_minutes_today,
          updated_at = NOW()
      WHERE user_id = v_user_record.user_id;
    END IF;

  END LOOP;
END;
$$;