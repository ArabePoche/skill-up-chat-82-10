-- Corriger la fonction approve_enrollment pour éviter les doublons de messages de bienvenue
CREATE OR REPLACE FUNCTION public.approve_enrollment(p_user_id uuid, p_formation_id uuid, p_enrollment_id uuid, p_decided_by uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  formation_title TEXT;
  first_lesson_id UUID;
  first_exercise_id UUID;
  SYSTEM_USER_ID CONSTANT UUID := '4c32c988-3b19-4eca-87cb-0e0595fd7fbb';
  existing_welcome_count INTEGER;
BEGIN
  -- Mettre à jour la demande d'inscription avec l'admin qui a pris la décision
  UPDATE enrollment_requests 
  SET status = 'approved',
      decided_by = p_decided_by,
      updated_at = now()
  WHERE id = p_enrollment_id;

  -- Récupérer le titre de la formation
  SELECT title INTO formation_title FROM formations WHERE id = p_formation_id;

  -- Notifier l'utilisateur
  PERFORM notify_enrollment_approved(p_user_id, p_formation_id, p_enrollment_id, formation_title);

  -- Récupérer la première leçon
  SELECT l.id INTO first_lesson_id
  FROM lessons l
  JOIN levels lv ON l.level_id = lv.id
  WHERE lv.formation_id = p_formation_id
  ORDER BY lv.order_index ASC, l.order_index ASC
  LIMIT 1;

  -- Si elle existe, vérifier s'il n'y a pas déjà un message de bienvenue
  IF first_lesson_id IS NOT NULL THEN
    -- Vérifier s'il existe déjà un message de bienvenue pour cet utilisateur dans cette leçon
    SELECT COUNT(*) INTO existing_welcome_count
    FROM lesson_messages
    WHERE receiver_id = p_user_id 
      AND lesson_id = first_lesson_id
      AND formation_id = p_formation_id
      AND is_system_message = true
      AND sender_id = SYSTEM_USER_ID
      AND content LIKE '%Bienvenue dans la formation%';

    -- Si aucun message de bienvenue n'existe déjà, procéder
    IF existing_welcome_count = 0 THEN
      -- Initialiser le progrès de la première leçon
      INSERT INTO user_lesson_progress (user_id, lesson_id, status, exercise_completed)
      VALUES (p_user_id, first_lesson_id, 'not_started', FALSE)
      ON CONFLICT (user_id, lesson_id) DO NOTHING;

      -- Récupérer le premier exercice
      SELECT id INTO first_exercise_id
      FROM exercises
      WHERE lesson_id = first_lesson_id
      ORDER BY created_at ASC
      LIMIT 1;

      -- Envoyer le message de bienvenue unique
      PERFORM send_welcome_message(
        p_user_id, SYSTEM_USER_ID, first_lesson_id, 
        p_formation_id, formation_title, first_exercise_id
      );
    END IF;
  END IF;
END;
$function$;