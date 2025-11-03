-- Mise à jour de validate_exercise_submission_global pour supporter p_teacher_id
DROP FUNCTION IF EXISTS validate_exercise_submission_global(uuid, uuid, boolean, text);

CREATE OR REPLACE FUNCTION validate_exercise_submission_global(
  p_message_id UUID,
  p_user_id UUID,
  p_is_approved BOOLEAN,
  p_reject_reason TEXT DEFAULT NULL,
  p_teacher_id UUID DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exercise_id UUID;
  v_lesson_id UUID;
  v_formation_id UUID;
  v_current_level_id UUID;
  v_all_exercises_in_lesson UUID[];
  v_current_exercise_index INT;
  v_next_exercise_id UUID;
  v_next_exercise_title TEXT;
  v_next_lesson_id UUID;
  v_next_lesson_title TEXT;
  v_next_level_id UUID;
  v_first_exercise_next_lesson UUID;
  v_first_lesson_next_level UUID;
  v_completed_exercises_count INT := 0;
  v_total_exercises_in_lesson INT;
  SYSTEM_USER_ID UUID := '4c32c988-3b19-4eca-87cb-0e0595fd7fbb'::uuid;
BEGIN
  -- Récupérer les infos du message
  SELECT exercise_id, lesson_id, formation_id
  INTO v_exercise_id, v_lesson_id, v_formation_id
  FROM lesson_messages
  WHERE id = p_message_id AND is_exercise_submission = true;

  IF v_lesson_id IS NULL THEN
    RAISE EXCEPTION 'Message de soumission d''exercice non trouvé';
  END IF;

  -- Récupérer le level_id
  SELECT level_id INTO v_current_level_id FROM lessons WHERE id = v_lesson_id;

  IF p_is_approved THEN
    -- Marquer cette soumission comme approuvée et ajouter le teacher_id
    UPDATE lesson_messages
    SET exercise_status = 'approved',
        validated_by_teacher_id = p_teacher_id,
        is_read = true,
        read_by_teachers = COALESCE(p_teacher_id, read_by_teachers)
    WHERE id = p_message_id;

    -- Marquer tous les messages de cette discussion comme lus si on a un teacher_id
    IF p_teacher_id IS NOT NULL THEN
      UPDATE lesson_messages
      SET is_read = true,
          read_by_teachers = COALESCE(read_by_teachers, p_teacher_id)
      WHERE lesson_id = v_lesson_id
        AND formation_id = v_formation_id
        AND (sender_id = p_user_id OR receiver_id = p_user_id)
        AND is_read = false;
    END IF;

    -- Vérifier si TOUTES les soumissions de cet exercice sont validées
    IF NOT check_all_exercise_submissions_approved(v_exercise_id, p_user_id) THEN
      -- Il reste des soumissions non validées pour cet exercice, ne rien faire de plus
      RETURN json_build_object(
        'success', true,
        'message', 'Soumission validée, mais d''autres soumissions de cet exercice doivent encore être validées',
        'exercise_fully_completed', false,
        'exercise_global_status', 'pending'
      );
    END IF;

    -- Toutes les soumissions de l'exercice sont validées, on peut débloquer le suivant
    
    -- Récupérer tous les exercices de la leçon
    SELECT array_agg(id ORDER BY created_at), COUNT(*)
    INTO v_all_exercises_in_lesson, v_total_exercises_in_lesson
    FROM exercises
    WHERE lesson_id = v_lesson_id;

    -- Compter combien d'exercices ont TOUTES leurs soumissions validées
    SELECT COUNT(DISTINCT e.id) INTO v_completed_exercises_count
    FROM exercises e
    WHERE e.lesson_id = v_lesson_id
      AND check_all_exercise_submissions_approved(e.id, p_user_id);

    -- Trouver l'index de l'exercice actuel
    SELECT i INTO v_current_exercise_index
    FROM generate_subscripts(v_all_exercises_in_lesson, 1) AS i
    WHERE v_all_exercises_in_lesson[i] = v_exercise_id;

    -- Si ce n'est pas le dernier exercice de la leçon
    IF v_current_exercise_index IS NOT NULL AND v_current_exercise_index < array_length(v_all_exercises_in_lesson, 1) THEN
      v_next_exercise_id := v_all_exercises_in_lesson[v_current_exercise_index + 1];
      SELECT title INTO v_next_exercise_title FROM exercises WHERE id = v_next_exercise_id;

      -- Envoyer le message avec le prochain exercice
      INSERT INTO lesson_messages (
        lesson_id, formation_id, level_id, sender_id, receiver_id,
        content, message_type, is_system_message, exercise_id
      ) VALUES (
        v_lesson_id, v_formation_id, v_current_level_id, SYSTEM_USER_ID, p_user_id,
        '✅ Excellent travail ! Toutes les soumissions de cet exercice sont validées. Voici ton prochain exercice : ' || COALESCE(v_next_exercise_title, 'Exercice suivant'),
        'system', true, v_next_exercise_id
      );

      RETURN json_build_object(
        'success', true,
        'message', 'Exercice complètement validé, prochain exercice débloqué',
        'exercise_fully_completed', true,
        'exercise_global_status', 'approved',
        'next_exercise_unlocked', true
      );

    -- Si tous les exercices de la leçon sont complétés
    ELSIF v_completed_exercises_count >= v_total_exercises_in_lesson THEN
      -- Marquer la leçon comme complétée
      UPDATE user_lesson_progress
      SET status = 'completed', exercise_completed = true, completed_at = now()
      WHERE user_id = p_user_id AND lesson_id = v_lesson_id;

      -- Chercher la prochaine leçon dans le même niveau
      SELECT l.id, l.title INTO v_next_lesson_id, v_next_lesson_title
      FROM lessons l
      WHERE l.level_id = v_current_level_id
        AND l.order_index > (SELECT order_index FROM lessons WHERE id = v_lesson_id)
      ORDER BY l.order_index
      LIMIT 1;

      -- Message de félicitation
      INSERT INTO lesson_messages (
        lesson_id, formation_id, level_id, sender_id, receiver_id,
        content, message_type, is_system_message
      ) VALUES (
        v_lesson_id, v_formation_id, v_current_level_id, SYSTEM_USER_ID, p_user_id,
        '🎉 Félicitations ! Vous avez terminé cette leçon avec succès ! 🎉',
        'system', true
      );

      IF v_next_lesson_id IS NOT NULL THEN
        -- Débloquer la prochaine leçon
        INSERT INTO user_lesson_progress (user_id, lesson_id, level_id, status, exercise_completed, create_at)
        VALUES (p_user_id, v_next_lesson_id, v_current_level_id, 'not_started', false, now())
        ON CONFLICT (user_id, lesson_id) DO NOTHING;

        SELECT e.id INTO v_first_exercise_next_lesson
        FROM exercises e
        WHERE e.lesson_id = v_next_lesson_id
        ORDER BY e.created_at
        LIMIT 1;

        INSERT INTO lesson_messages (
          lesson_id, formation_id, level_id, sender_id, receiver_id,
          content, message_type, is_system_message
        ) VALUES (
          v_lesson_id, v_formation_id, v_current_level_id, SYSTEM_USER_ID, p_user_id,
          '🚀 Bonne nouvelle ! Vous avez débloqué la leçon suivante : "' || v_next_lesson_title || '"',
          'system', true
        );

        IF v_first_exercise_next_lesson IS NOT NULL THEN
          INSERT INTO lesson_messages (
            lesson_id, formation_id, level_id, sender_id, receiver_id,
            content, message_type, is_system_message, exercise_id
          ) VALUES (
            v_next_lesson_id, v_formation_id, v_current_level_id, SYSTEM_USER_ID, p_user_id,
            '👋 Bienvenue dans cette nouvelle leçon ! Voici votre premier exercice :',
            'system', true, v_first_exercise_next_lesson
          );
        END IF;

        RETURN json_build_object(
          'success', true,
          'message', 'Leçon complétée, prochaine leçon débloquée',
          'exercise_global_status', 'approved',
          'lesson_completed', true,
          'next_lesson_unlocked', true
        );
      ELSE
        -- Pas de leçon suivante dans ce niveau, chercher le niveau suivant
        SELECT lv.id INTO v_next_level_id
        FROM levels lv
        WHERE lv.formation_id = (SELECT formation_id FROM levels WHERE id = v_current_level_id)
          AND lv.order_index > (SELECT order_index FROM levels WHERE id = v_current_level_id)
        ORDER BY lv.order_index
        LIMIT 1;

        IF v_next_level_id IS NOT NULL THEN
          SELECT l.id, l.title INTO v_first_lesson_next_level, v_next_lesson_title
          FROM lessons l
          WHERE l.level_id = v_next_level_id
          ORDER BY l.order_index
          LIMIT 1;

          IF v_first_lesson_next_level IS NOT NULL THEN
            INSERT INTO user_lesson_progress (user_id, lesson_id, level_id, status, exercise_completed, create_at)
            VALUES (p_user_id, v_first_lesson_next_level, v_next_level_id, 'not_started', false, now())
            ON CONFLICT (user_id, lesson_id) DO NOTHING;

            INSERT INTO lesson_messages (
              lesson_id, formation_id, level_id, sender_id, receiver_id,
              content, message_type, is_system_message
            ) VALUES (
              v_lesson_id, v_formation_id, v_current_level_id, SYSTEM_USER_ID, p_user_id,
              '🎖️ Incroyable ! Vous avez terminé ce niveau et débloqué le niveau suivant avec la leçon : "' || v_next_lesson_title || '" !',
              'system', true
            );

            SELECT e.id INTO v_first_exercise_next_lesson
            FROM exercises e
            WHERE e.lesson_id = v_first_lesson_next_level
            ORDER BY e.created_at
            LIMIT 1;

            IF v_first_exercise_next_lesson IS NOT NULL THEN
              INSERT INTO lesson_messages (
                lesson_id, formation_id, level_id, sender_id, receiver_id,
                content, message_type, is_system_message, exercise_id
              ) VALUES (
                v_first_lesson_next_level, v_formation_id, v_next_level_id, SYSTEM_USER_ID, p_user_id,
                '🌟 Félicitations ! Vous entrez dans un nouveau niveau. Voici votre premier exercice :',
                'system', true, v_first_exercise_next_lesson
              );
            END IF;

            RETURN json_build_object(
              'success', true,
              'message', 'Niveau complété, nouveau niveau débloqué',
              'exercise_global_status', 'approved',
              'level_completed', true,
              'next_level_unlocked', true
            );
          END IF;
        ELSE
          -- Formation complète
          INSERT INTO lesson_messages (
            lesson_id, formation_id, level_id, sender_id, receiver_id,
            content, message_type, is_system_message
          ) VALUES (
            v_lesson_id, v_formation_id, v_current_level_id, SYSTEM_USER_ID, p_user_id,
            '🏆 Bravo ! Vous avez terminé toutes les leçons de cette formation ! 🏆',
            'system', true
          );

          RETURN json_build_object(
            'success', true,
            'message', 'Formation complète !',
            'exercise_global_status', 'approved',
            'formation_completed', true
          );
        END IF;
      END IF;
    END IF;

  ELSE
    -- Rejeter la soumission
    UPDATE lesson_messages
    SET exercise_status = 'rejected',
        content = '❌ Exercice rejeté. Raison : ' || COALESCE(p_reject_reason, 'Non spécifiée'),
        validated_by_teacher_id = p_teacher_id
    WHERE id = p_message_id;

    UPDATE user_lesson_progress
    SET status = 'in_progress', exercise_completed = false
    WHERE user_id = p_user_id AND lesson_id = v_lesson_id;

    RETURN json_build_object(
      'success', true,
      'message', 'Soumission rejetée',
      'rejected', true
    );
  END IF;

  RETURN json_build_object('success', true, 'message', 'Validation effectuée');
END;
$$;