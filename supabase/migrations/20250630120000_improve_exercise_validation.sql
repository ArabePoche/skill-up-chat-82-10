
-- Amélioration de la fonction validate_exercise_submission
CREATE OR REPLACE FUNCTION public.validate_exercise_submission(
  p_message_id UUID,
  p_user_id UUID,
  p_is_valid BOOLEAN,
  p_reject_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  exercise_id UUID;
  lesson_id UUID;
  formation_id UUID;
  all_exercises_ids UUID[];
  validated_exercises_ids UUID[];
  current_exercise_index INT;
  next_exercise_id UUID;
  next_exercise_title TEXT;
  current_level_id UUID;
  next_lesson_id UUID;
  next_lesson_title TEXT;
  first_exercise_next_lesson UUID;
  SYSTEM_USER_ID CONSTANT UUID := '4c32c988-3b19-4eca-87cb-0e0595fd7fbb';
BEGIN
  -- Récupérer les informations du message
  SELECT lm.exercise_id, lm.lesson_id, lm.formation_id
  INTO exercise_id, lesson_id, formation_id
  FROM lesson_messages lm
  WHERE lm.id = p_message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message non trouvé';
  END IF;

  IF p_is_valid THEN
    -- Marquer l'exercice comme validé
    UPDATE lesson_messages
    SET exercise_status = 'approved'
    WHERE id = p_message_id;

    -- Récupérer tous les exercices de la leçon (ordonnés par création)
    SELECT array_agg(id ORDER BY created_at)
    INTO all_exercises_ids
    FROM exercises
    WHERE lesson_id = lesson_id;

    -- Récupérer les exercices déjà validés pour cet utilisateur
    SELECT array_agg(DISTINCT lm.exercise_id)
    INTO validated_exercises_ids
    FROM lesson_messages lm
    WHERE lm.lesson_id = lesson_id
      AND lm.sender_id = p_user_id
      AND lm.is_exercise_submission = true
      AND lm.exercise_status = 'approved'
      AND lm.exercise_id IS NOT NULL;

    -- Trouver l'index de l'exercice actuel
    SELECT i INTO current_exercise_index
    FROM generate_subscripts(all_exercises_ids, 1) AS i
    WHERE all_exercises_ids[i] = exercise_id;

    -- Vérifier s'il reste des exercices dans cette leçon
    IF current_exercise_index IS NOT NULL AND current_exercise_index < array_length(all_exercises_ids, 1) THEN
      -- Il y a encore des exercices dans cette leçon
      next_exercise_id := all_exercises_ids[current_exercise_index + 1];
      
      -- Récupérer le titre du prochain exercice
      SELECT title INTO next_exercise_title
      FROM exercises
      WHERE id = next_exercise_id;

      -- Insérer le message système avec le prochain exercice
      INSERT INTO lesson_messages (
        lesson_id, formation_id, sender_id, receiver_id,
        content, message_type, is_system_message, exercise_id
      ) VALUES (
        lesson_id, formation_id, SYSTEM_USER_ID, p_user_id,
        '✅ Bien joué ! Voici ton prochain exercice : ' || COALESCE(next_exercise_title, 'Exercice suivant'),
        'system', true, next_exercise_id
      );
    ELSE
      -- Tous les exercices de cette leçon sont terminés
      -- Marquer la leçon comme complétée
      UPDATE user_lesson_progress
      SET status = 'completed', exercise_completed = true, completed_at = now()
      WHERE user_id = p_user_id AND lesson_id = lesson_id;

      -- Récupérer le level_id de la leçon courante
      SELECT level_id INTO current_level_id
      FROM lessons 
      WHERE id = lesson_id;

      -- Trouver la prochaine leçon dans le même niveau
      SELECT id, title INTO next_lesson_id, next_lesson_title
      FROM lessons
      WHERE level_id = current_level_id 
      AND order_index > (
          SELECT order_index 
          FROM lessons 
          WHERE id = lesson_id
      )
      ORDER BY order_index ASC
      LIMIT 1;

      -- Si une prochaine leçon existe, la déverrouiller
      IF next_lesson_id IS NOT NULL THEN
          -- Ajouter la nouvelle leçon dans user_lesson_progress
          INSERT INTO user_lesson_progress (user_id, lesson_id, status, exercise_completed)
          VALUES (p_user_id, next_lesson_id, 'not_started', false)
          ON CONFLICT (user_id, lesson_id) DO NOTHING;

          -- Récupérer le premier exercice de la prochaine leçon
          SELECT id INTO first_exercise_next_lesson
          FROM exercises
          WHERE lesson_id = next_lesson_id
          ORDER BY created_at ASC
          LIMIT 1;

          -- Envoyer un message système pour la nouvelle leçon
          IF first_exercise_next_lesson IS NOT NULL THEN
              INSERT INTO lesson_messages (
                  lesson_id, formation_id, sender_id, receiver_id,
                  content, message_type, is_system_message, exercise_id
              ) VALUES (
                  lesson_id, formation_id, SYSTEM_USER_ID, p_user_id,
                  '🎉 Félicitations ! Vous avez terminé cette leçon. Voici le premier exercice de la leçon suivante : "' || next_lesson_title || '"',
                  'system', true, first_exercise_next_lesson
              );
          ELSE
              INSERT INTO lesson_messages (
                  lesson_id, formation_id, sender_id, receiver_id,
                  content, message_type, is_system_message
              ) VALUES (
                  lesson_id, formation_id, SYSTEM_USER_ID, p_user_id,
                  '🎉 Félicitations ! Vous avez terminé cette leçon et débloqué la suivante : "' || next_lesson_title || '"',
                  'system', true
              );
          END IF;
      ELSE
          -- Message de félicitations pour la fin du niveau
          INSERT INTO lesson_messages (
              lesson_id, formation_id, sender_id, receiver_id,
              content, message_type, is_system_message
          ) VALUES (
              lesson_id, formation_id, SYSTEM_USER_ID, p_user_id,
              '🏆 Bravo ! Vous avez terminé toutes les leçons de ce niveau !',
              'system', true
          );
      END IF;
    END IF;
  ELSE
    -- Marquer comme rejeté avec raison
    UPDATE lesson_messages
    SET exercise_status = 'rejected',
        content = '❌ Exercice rejeté. Raison : ' || COALESCE(p_reject_reason, 'Non spécifiée')
    WHERE id = p_message_id;

    -- Remettre la leçon en "in_progress"
    UPDATE user_lesson_progress
    SET status = 'in_progress', exercise_completed = false
    WHERE user_id = p_user_id AND lesson_id = lesson_id;
  END IF;
END;
$$;

-- Supprimer l'ancienne fonction handle_validated_exercise qui n'est plus nécessaire
DROP FUNCTION IF EXISTS public.handle_validated_exercise(UUID, UUID, UUID, UUID);
