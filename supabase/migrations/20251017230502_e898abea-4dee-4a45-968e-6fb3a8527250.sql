-- Ajouter une colonne pour stocker l'ID du professeur qui valide l'exercice
ALTER TABLE lesson_messages 
ADD COLUMN IF NOT EXISTS validated_by_teacher_id UUID REFERENCES profiles(id);

-- Fonction modifiée pour validate_exercise_submission avec marquage automatique comme lu
CREATE OR REPLACE FUNCTION public.validate_exercise_submission(
  p_message_id uuid, 
  p_user_id uuid, 
  p_is_valid boolean, 
  p_reject_reason text DEFAULT NULL,
  p_teacher_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_exercise_id UUID;
  v_lesson_id UUID;
  v_formation_id UUID;
  v_all_exercises UUID[];
  v_index INT;
  v_next_exercise_id UUID;
  v_next_exercise_title TEXT;
  v_current_level_id UUID;
  v_next_lesson_id UUID;
  v_next_lesson_title TEXT;
  v_first_exercise_next_lesson UUID;
  v_total_exercises INT;
  v_approved_exercises INT;
  SYSTEM_USER_ID CONSTANT UUID := '4c32c988-3b19-4eca-87cb-0e0595fd7fbb';
BEGIN
  -- Récupération des infos du message
  SELECT lm.exercise_id, lm.lesson_id, lm.formation_id
  INTO v_exercise_id, v_lesson_id, v_formation_id
  FROM lesson_messages lm
  WHERE lm.id = p_message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message introuvable';
  END IF;

  IF p_is_valid THEN
    -- Valider le message et stocker l'ID du professeur validateur
    UPDATE lesson_messages
    SET exercise_status = 'approved',
        validated_by_teacher_id = p_teacher_id,
        is_read = true,
        read_by_teachers = p_teacher_id
    WHERE id = p_message_id;

    -- Marquer tous les messages de cette discussion comme lus pour tous les professeurs
    UPDATE lesson_messages
    SET is_read = true,
        read_by_teachers = COALESCE(read_by_teachers, p_teacher_id)
    WHERE lesson_id = v_lesson_id
      AND formation_id = v_formation_id
      AND (sender_id = p_user_id OR receiver_id = p_user_id)
      AND is_read = false;

    -- ... keep existing code (logique de déblocage des exercices et leçons suivantes)
    SELECT array_agg(e.id ORDER BY e.created_at), COUNT(*)
    INTO v_all_exercises, v_total_exercises
    FROM exercises e
    WHERE e.lesson_id = v_lesson_id;

    SELECT COUNT(DISTINCT lm.exercise_id)
    INTO v_approved_exercises
    FROM lesson_messages lm
    WHERE lm.lesson_id = v_lesson_id
      AND lm.sender_id = p_user_id
      AND lm.is_exercise_submission = true
      AND lm.exercise_status = 'approved'
      AND lm.exercise_id IS NOT NULL;

    SELECT i INTO v_index
    FROM generate_subscripts(v_all_exercises, 1) AS i
    WHERE v_all_exercises[i] = v_exercise_id;

    IF v_index IS NOT NULL AND v_index < array_length(v_all_exercises, 1) THEN
      v_next_exercise_id := v_all_exercises[v_index + 1];

      SELECT title INTO v_next_exercise_title
      FROM exercises
      WHERE id = v_next_exercise_id;

      INSERT INTO lesson_messages (
        lesson_id, formation_id, sender_id, receiver_id,
        content, message_type, is_system_message, exercise_id
      ) VALUES (
        v_lesson_id, v_formation_id, SYSTEM_USER_ID, p_user_id,
        '✅ Bien joué ! Voici ton prochain exercice : ' || COALESCE(v_next_exercise_title, 'Exercice suivant'),
        'system', true, v_next_exercise_id
      );

    ELSIF v_approved_exercises >= v_total_exercises THEN
      UPDATE user_lesson_progress
      SET status = 'completed', exercise_completed = true, completed_at = now()
      WHERE user_id = p_user_id AND lesson_id = v_lesson_id;

      SELECT l.level_id INTO v_current_level_id
      FROM lessons l
      WHERE l.id = v_lesson_id;

      SELECT l.id, l.title INTO v_next_lesson_id, v_next_lesson_title
      FROM lessons l
      WHERE l.level_id = v_current_level_id
        AND l.order_index > (
          SELECT order_index FROM lessons WHERE id = v_lesson_id
        )
      ORDER BY l.order_index
      LIMIT 1;

      INSERT INTO lesson_messages (
        lesson_id, formation_id, sender_id, receiver_id,
        content, message_type, is_system_message
      ) VALUES (
        v_lesson_id, v_formation_id, SYSTEM_USER_ID, p_user_id,
        '🎉 Félicitations ! Vous avez terminé cette leçon avec succès ! 🎉',
        'system', true
      );

      IF v_next_lesson_id IS NOT NULL THEN
        INSERT INTO user_lesson_progress (user_id, lesson_id, status, exercise_completed)
        VALUES (p_user_id, v_next_lesson_id, 'not_started', false)
        ON CONFLICT (user_id, lesson_id) DO NOTHING;

        INSERT INTO lesson_messages (
          lesson_id, formation_id, sender_id, receiver_id,
          content, message_type, is_system_message
        ) VALUES (
          v_lesson_id, v_formation_id, SYSTEM_USER_ID, p_user_id,
          '🚀 Bonne nouvelle ! Vous avez débloqué la leçon suivante : "' || v_next_lesson_title || '". Cliquez ici pour la découvrir !',
          'system', true
        );

        SELECT e.id INTO v_first_exercise_next_lesson
        FROM exercises e
        WHERE e.lesson_id = v_next_lesson_id
        ORDER BY e.created_at
        LIMIT 1;

        IF v_first_exercise_next_lesson IS NOT NULL THEN
          INSERT INTO lesson_messages (
            lesson_id, formation_id, sender_id, receiver_id,
            content, message_type, is_system_message, exercise_id
          ) VALUES (
            v_next_lesson_id, v_formation_id, SYSTEM_USER_ID, p_user_id,
            '👋 Bienvenue dans cette nouvelle leçon ! Voici votre premier exercice :',
            'system', true, v_first_exercise_next_lesson
          );
        END IF;
      END IF;
    END IF;

  ELSE
    -- Marquer l'exercice comme rejeté et stocker l'ID du professeur
    UPDATE lesson_messages
    SET exercise_status = 'rejected',
        validated_by_teacher_id = p_teacher_id,
        is_read = true,
        read_by_teachers = p_teacher_id,
        content = '❌ Exercice rejeté. Raison : ' || COALESCE(p_reject_reason, 'Non spécifiée')
    WHERE id = p_message_id;

    -- Marquer tous les messages de cette discussion comme lus
    UPDATE lesson_messages
    SET is_read = true,
        read_by_teachers = COALESCE(read_by_teachers, p_teacher_id)
    WHERE lesson_id = v_lesson_id
      AND formation_id = v_formation_id
      AND (sender_id = p_user_id OR receiver_id = p_user_id)
      AND is_read = false;

    UPDATE user_lesson_progress
    SET status = 'in_progress', exercise_completed = false
    WHERE user_id = p_user_id AND lesson_id = v_lesson_id;
  END IF;
END;
$function$;

-- Fonction modifiée pour validate_exercise_submission_with_promotion
CREATE OR REPLACE FUNCTION public.validate_exercise_submission_with_promotion(
  p_message_id uuid, 
  p_user_id uuid, 
  p_is_approved boolean, 
  p_reject_reason text DEFAULT NULL,
  p_teacher_id uuid DEFAULT NULL
)
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
  SYSTEM_USER_ID UUID := '4c32c988-3b19-4eca-87cb-0e0595fd7fbb'::uuid;
BEGIN
  SELECT lesson_id, formation_id, promotion_id, exercise_id
  INTO v_lesson_id, v_formation_id, v_promotion_id, v_exercise_id
  FROM lesson_messages
  WHERE id = p_message_id AND is_exercise_submission = true;

  IF v_lesson_id IS NULL THEN
    RAISE EXCEPTION 'Message de soumission d''exercice non trouvé';
  END IF;

  SELECT level_id INTO v_current_level_id FROM lessons WHERE id = v_lesson_id;

  IF NOT EXISTS (
    SELECT 1 FROM user_lesson_progress ulp
    WHERE ulp.user_id = p_user_id AND ulp.lesson_id = v_lesson_id
  ) THEN
    RAISE EXCEPTION 'L''utilisateur n''a pas accès à cette leçon';
  END IF;

  IF p_is_approved THEN
    -- Marquer comme approuvé et stocker l'ID du professeur
    UPDATE lesson_messages
    SET exercise_status = 'approved',
        validated_by_teacher_id = p_teacher_id,
        is_read = true,
        read_by_teachers = p_teacher_id
    WHERE id = p_message_id;

    -- Marquer tous les messages de la promotion comme lus
    UPDATE lesson_messages
    SET is_read = true,
        read_by_teachers = COALESCE(read_by_teachers, p_teacher_id)
    WHERE lesson_id = v_lesson_id
      AND formation_id = v_formation_id
      AND promotion_id = v_promotion_id
      AND (sender_id = p_user_id OR receiver_id = p_user_id)
      AND is_read = false;

    -- ... keep existing code (logique de déblocage)
    SELECT 
      COUNT(DISTINCT e.id),
      COUNT(DISTINCT CASE WHEN lm.exercise_status = 'approved' THEN e.id END)
    INTO v_total_exercises, v_approved_exercises
    FROM exercises e
    LEFT JOIN lesson_messages lm ON e.id = lm.exercise_id 
      AND lm.sender_id = p_user_id 
      AND lm.is_exercise_submission = true
    WHERE e.lesson_id = v_lesson_id;

    IF v_approved_exercises < v_total_exercises THEN
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

      INSERT INTO lesson_messages (
        lesson_id, formation_id, promotion_id, sender_id, receiver_id,
        content, message_type, is_system_message, exercise_id
      ) VALUES (
        v_lesson_id, v_formation_id, v_promotion_id, SYSTEM_USER_ID, p_user_id,
        '✅ Bien joué ! Voici ton prochain exercice : ' || COALESCE(v_next_exercise_title, 'Exercice suivant'),
        'system', true, v_next_exercise_id
      );

    ELSIF v_approved_exercises >= v_total_exercises THEN
      UPDATE user_lesson_progress
      SET status = 'completed', exercise_completed = true, completed_at = now()
      WHERE user_id = p_user_id AND lesson_id = v_lesson_id;

      SELECT l.id, l.title INTO v_next_lesson_id, v_next_lesson_title
      FROM lessons l
      WHERE l.level_id = v_current_level_id
        AND l.order_index > (SELECT order_index FROM lessons WHERE id = v_lesson_id)
      ORDER BY l.order_index
      LIMIT 1;

      INSERT INTO lesson_messages (
        lesson_id, formation_id, promotion_id, sender_id, receiver_id,
        content, message_type, is_system_message
      ) VALUES (
        v_lesson_id, v_formation_id, v_promotion_id, SYSTEM_USER_ID, p_user_id,
        '🎉 Félicitations ! Vous avez terminé cette leçon avec succès ! 🎉',
        'system', true
      );

      IF v_next_lesson_id IS NOT NULL THEN
        INSERT INTO user_lesson_progress (user_id, lesson_id, level_id, status, exercise_completed, create_at)
        VALUES (p_user_id, v_next_lesson_id, v_current_level_id, 'not_started', false, now())
        ON CONFLICT (user_id, lesson_id) DO NOTHING;

        SELECT e.id INTO v_first_exercise_next_lesson
        FROM exercises e
        WHERE e.lesson_id = v_next_lesson_id
        ORDER BY e.created_at
        LIMIT 1;

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
      END IF;
    END IF;

  ELSE
    -- Marquer comme rejeté et stocker l'ID du professeur
    UPDATE lesson_messages
    SET exercise_status = 'rejected',
        validated_by_teacher_id = p_teacher_id,
        is_read = true,
        read_by_teachers = p_teacher_id,
        content = '❌ Exercice rejeté. Raison : ' || COALESCE(p_reject_reason, 'Non spécifiée')
    WHERE id = p_message_id;

    -- Marquer tous les messages de la promotion comme lus
    UPDATE lesson_messages
    SET is_read = true,
        read_by_teachers = COALESCE(read_by_teachers, p_teacher_id)
    WHERE lesson_id = v_lesson_id
      AND formation_id = v_formation_id
      AND promotion_id = v_promotion_id
      AND (sender_id = p_user_id OR receiver_id = p_user_id)
      AND is_read = false;

    UPDATE user_lesson_progress
    SET status = 'in_progress', exercise_completed = false
    WHERE user_id = p_user_id AND lesson_id = v_lesson_id;
  END IF;
END;
$function$;