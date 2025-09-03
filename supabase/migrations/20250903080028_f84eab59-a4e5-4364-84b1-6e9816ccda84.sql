-- Mise à jour des fonctions pour inclure level_id lors de l'insertion dans user_lesson_progress

-- 1. Fonction approve_enrollment - ajouter level_id
CREATE OR REPLACE FUNCTION public.approve_enrollment(p_user_id uuid, p_formation_id uuid, p_enrollment_id uuid, p_decided_by uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  formation_title TEXT;
  first_lesson_id UUID;
  first_level_id UUID;
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

  -- Récupérer la première leçon ET son level_id
  SELECT l.id, l.level_id INTO first_lesson_id, first_level_id
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
      -- Initialiser le progrès de la première leçon avec create_at ET level_id
      INSERT INTO user_lesson_progress (user_id, lesson_id, level_id, status, exercise_completed, create_at)
      VALUES (p_user_id, first_lesson_id, first_level_id, 'not_started', FALSE, now())
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

-- 2. Fonction validate_exercise_submission_with_promotion - ajouter level_id
CREATE OR REPLACE FUNCTION public.validate_exercise_submission_with_promotion(p_message_id uuid, p_user_id uuid, p_is_approved boolean, p_reject_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_lesson_id UUID;
  v_formation_id UUID;
  v_promotion_id UUID;
  v_exercise_id UUID;
  v_total_exercises INTEGER;
  v_approved_exercises INTEGER;
  v_next_exercise_id UUID;
  v_next_exercise_title TEXT;
  v_next_lesson_id UUID;
  v_next_lesson_title TEXT;
  v_current_level_id UUID;
  v_next_level_id UUID;
  v_first_exercise_next_lesson UUID;
  v_first_exercise_next_level UUID;
  v_first_lesson_next_level UUID;
  SYSTEM_USER_ID UUID := '4c32c988-3b19-4eca-87cb-0e0595fd7fbb'::uuid;
BEGIN
  -- Récupérer les infos du message
  SELECT lesson_id, formation_id, promotion_id, exercise_id
  INTO v_lesson_id, v_formation_id, v_promotion_id, v_exercise_id
  FROM lesson_messages
  WHERE id = p_message_id AND is_exercise_submission = true;

  IF v_lesson_id IS NULL THEN
    RAISE EXCEPTION 'Message de soumission d''exercice non trouvé';
  END IF;

  -- Vérifier si la leçon est débloquée dans user_lesson_progress
  IF NOT EXISTS (
    SELECT 1 FROM user_lesson_progress ulp
    WHERE ulp.user_id = p_user_id AND ulp.lesson_id = v_lesson_id
  ) THEN
    RAISE EXCEPTION 'L''utilisateur n''a pas accès à cette leçon';
  END IF;

  IF p_is_approved THEN
    -- Marquer l'exercice comme approuvé
    UPDATE lesson_messages
    SET exercise_status = 'approved'
    WHERE id = p_message_id;

    -- Compter les exercices total et approuvés pour cette leçon
    SELECT 
      COUNT(DISTINCT e.id),
      COUNT(DISTINCT CASE WHEN lm.exercise_status = 'approved' THEN e.id END)
    INTO v_total_exercises, v_approved_exercises
    FROM exercises e
    LEFT JOIN lesson_messages lm ON e.id = lm.exercise_id 
      AND lm.sender_id = p_user_id 
      AND lm.is_exercise_submission = true
    WHERE e.lesson_id = v_lesson_id;

    -- Si ce n'est pas le dernier exercice de la leçon
    IF v_approved_exercises < v_total_exercises THEN
      -- Trouver le prochain exercice non traité
      SELECT e.id, e.title INTO v_next_exercise_id, v_next_exercise_title
      FROM exercises e
      WHERE e.lesson_id = v_lesson_id
        AND NOT EXISTS (
          SELECT 1 FROM lesson_messages lm 
          WHERE lm.exercise_id = e.id 
            AND lm.sender_id = p_user_id 
            AND lm.exercise_status = 'approved'
        )
      ORDER BY e.created_at
      LIMIT 1;

      -- Ajouter le message avec le prochain exercice
      INSERT INTO lesson_messages (
        lesson_id, formation_id, promotion_id, sender_id, receiver_id,
        content, message_type, is_system_message, exercise_id
      ) VALUES (
        v_lesson_id, v_formation_id, v_promotion_id, SYSTEM_USER_ID, p_user_id,
        '✅ Bien joué ! Voici ton prochain exercice : ' || COALESCE(v_next_exercise_title, 'Exercice suivant'),
        'system', true, v_next_exercise_id
      );

    -- Si tous les exercices sont terminés
    ELSIF v_approved_exercises >= v_total_exercises THEN
      UPDATE user_lesson_progress
      SET status = 'completed', exercise_completed = true, completed_at = now()
      WHERE user_id = p_user_id AND lesson_id = v_lesson_id;

      -- Trouver le niveau actuel
      SELECT l.level_id INTO v_current_level_id
      FROM lessons l
      WHERE l.id = v_lesson_id;

      -- Trouver la prochaine leçon dans le même niveau
      SELECT l.id, l.title INTO v_next_lesson_id, v_next_lesson_title
      FROM lessons l
      WHERE l.level_id = v_current_level_id
        AND l.order_index > (
          SELECT order_index FROM lessons WHERE id = v_lesson_id
        )
      ORDER BY l.order_index
      LIMIT 1;

      -- Message de félicitation dans la leçon actuelle
      INSERT INTO lesson_messages (
        lesson_id, formation_id, promotion_id, sender_id, receiver_id,
        content, message_type, is_system_message
      ) VALUES (
        v_lesson_id, v_formation_id, v_promotion_id, SYSTEM_USER_ID, p_user_id,
        '🎉 Félicitations ! Vous avez terminé cette leçon avec succès ! 🎉',
        'system', true
      );

      -- Si prochaine leçon existe dans le même niveau
      IF v_next_lesson_id IS NOT NULL THEN
        INSERT INTO user_lesson_progress (user_id, lesson_id, level_id, status, exercise_completed, create_at)
        VALUES (p_user_id, v_next_lesson_id, v_current_level_id, 'not_started', false, now())
        ON CONFLICT (user_id, lesson_id) DO NOTHING;

        -- Premier exercice de la prochaine leçon
        SELECT e.id INTO v_first_exercise_next_lesson
        FROM exercises e
        WHERE e.lesson_id = v_next_lesson_id
        ORDER BY e.created_at
        LIMIT 1;

        -- Message de bienvenue dans la nouvelle leçon avec promotion
        IF v_first_exercise_next_lesson IS NOT NULL THEN
          INSERT INTO lesson_messages (
            lesson_id, formation_id, promotion_id, sender_id, receiver_id,
            content, message_type, is_system_message, exercise_id
          ) VALUES (
            v_next_lesson_id, v_formation_id, v_promotion_id, SYSTEM_USER_ID, p_user_id,
            '👋 Bienvenue dans cette nouvelle leçon ! Voici votre premier exercice :',
            'system', true, v_first_exercise_next_lesson
          );
        END IF;
      -- Sinon, débloquer le niveau suivant
      ELSE
        -- Trouver le niveau suivant
        SELECT lvl.id INTO v_next_level_id
        FROM levels lvl
        WHERE lvl.formation_id = (
            SELECT formation_id FROM levels WHERE id = v_current_level_id
          )
          AND lvl.order_index > (
            SELECT order_index FROM levels WHERE id = v_current_level_id
          )
        ORDER BY lvl.order_index
        LIMIT 1;

        IF v_next_level_id IS NOT NULL THEN
          -- Première leçon du niveau suivant
          SELECT l.id, l.title INTO v_first_lesson_next_level, v_next_lesson_title
          FROM lessons l
          WHERE l.level_id = v_next_level_id
          ORDER BY l.order_index
          LIMIT 1;

          IF v_first_lesson_next_level IS NOT NULL THEN
            -- Débloquer la première leçon du niveau suivant avec level_id
            INSERT INTO user_lesson_progress (user_id, lesson_id, level_id, status, exercise_completed, create_at)
            VALUES (p_user_id, v_first_lesson_next_level, v_next_level_id, 'not_started', false, now())
            ON CONFLICT (user_id, lesson_id) DO NOTHING;

            -- Premier exercice du niveau suivant
            SELECT e.id INTO v_first_exercise_next_level
            FROM exercises e
            WHERE e.lesson_id = v_first_lesson_next_level
            ORDER BY e.created_at
            LIMIT 1;

            -- Message pour le nouveau niveau
            IF v_first_exercise_next_level IS NOT NULL THEN
              INSERT INTO lesson_messages (
                lesson_id, formation_id, promotion_id, sender_id, receiver_id,
                content, message_type, is_system_message, exercise_id
              ) VALUES (
                v_first_lesson_next_level, v_formation_id, v_promotion_id, SYSTEM_USER_ID, p_user_id,
                '🚀 Félicitations ! Vous avez débloqué le niveau suivant ! Voici votre premier exercice :',
                'system', true, v_first_exercise_next_level
              );
            END IF;
          END IF;
        END IF;
      END IF;
    END IF;

  ELSE
    -- Marquer l'exercice comme rejeté
    UPDATE lesson_messages
    SET exercise_status = 'rejected',
        content = '❌ Exercice rejeté. Raison : ' || COALESCE(p_reject_reason, 'Non spécifiée')
    WHERE id = p_message_id;

    -- Réinitialiser la leçon
    UPDATE user_lesson_progress
    SET status = 'in_progress', exercise_completed = false
    WHERE user_id = p_user_id AND lesson_id = v_lesson_id;
  END IF;
END;
$function$;