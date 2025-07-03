
-- Supprimer les anciennes versions des fonctions
DROP FUNCTION IF EXISTS public.validate_exercise_submission(UUID, UUID, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS public.handle_validated_exercise(UUID, UUID, UUID, UUID);

-- 1. Fonction principale côté Supabase : validate_exercise_submission
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
BEGIN
  -- Trouver le message avec info exercice
  SELECT exercise_id, lesson_id, formation_id
  INTO exercise_id, lesson_id, formation_id
  FROM lesson_messages
  WHERE id = p_message_id;

  IF p_is_valid THEN
    -- Marquer comme validé
    UPDATE lesson_messages
    SET exercise_status = 'approved'
    WHERE id = p_message_id;

    -- Gérer l'approbation
    PERFORM handle_validated_exercise(p_user_id, lesson_id, formation_id, exercise_id);
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

-- 2. Fonction appelée : handle_validated_exercise
CREATE OR REPLACE FUNCTION public.handle_validated_exercise(
  p_user_id UUID,
  p_lesson_id UUID,
  p_formation_id UUID,
  p_validated_exercise_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  all_ids UUID[];
  validated_ids UUID[];
  current_index INT;
  next_exercise_id UUID;
  exercise_title TEXT;
  next_lesson_id UUID;
  next_lesson_title TEXT;
  first_exercise_next_lesson UUID;
  current_level_id UUID;
  SYSTEM_USER_ID CONSTANT UUID := '4c32c988-3b19-4eca-87cb-0e0595fd7fbb';
BEGIN
  -- Tous les exercices de la leçon (ordonnés par date de création)
  SELECT array_agg(id ORDER BY created_at)
  INTO all_ids
  FROM exercises
  WHERE lesson_id = p_lesson_id;

  -- Tous les exercices validés par l'utilisateur pour cette leçon
  SELECT array_agg(exercise_id)
  INTO validated_ids
  FROM lesson_messages
  WHERE lesson_id = p_lesson_id
    AND sender_id = p_user_id
    AND is_exercise_submission = true
    AND exercise_status = 'approved'
    AND exercise_id IS NOT NULL;

  -- Trouver l'index de l'exercice actuel
  SELECT i INTO current_index
  FROM generate_subscripts(all_ids, 1) AS i
  WHERE all_ids[i] = p_validated_exercise_id;

  -- Vérifier si tous les exercices sont validés
  IF array_length(validated_ids, 1) >= array_length(all_ids, 1) THEN
    -- Marquer la leçon comme terminée
    UPDATE user_lesson_progress
    SET status = 'completed', exercise_completed = true, completed_at = now()
    WHERE user_id = p_user_id AND lesson_id = p_lesson_id;

    -- Récupérer le level_id de la leçon courante
    SELECT level_id INTO current_level_id
    FROM lessons 
    WHERE id = p_lesson_id;

    -- Trouver la prochaine leçon dans le même niveau
    SELECT id, title INTO next_lesson_id, next_lesson_title
    FROM lessons
    WHERE level_id = current_level_id 
    AND order_index > (
        SELECT order_index 
        FROM lessons 
        WHERE id = p_lesson_id
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
                lesson_id,
                formation_id,
                sender_id,
                receiver_id,
                content,
                message_type,
                is_system_message,
                exercise_id
            ) VALUES (
                p_lesson_id,
                p_formation_id,
                SYSTEM_USER_ID,
                p_user_id,
                '🎉 Félicitations ! Vous avez terminé cette leçon. Voici le premier exercice de la leçon suivante : "' || next_lesson_title || '"',
                'system',
                true,
                first_exercise_next_lesson
            );
        ELSE
            INSERT INTO lesson_messages (
                lesson_id,
                formation_id,
                sender_id,
                receiver_id,
                content,
                message_type,
                is_system_message
            ) VALUES (
                p_lesson_id,
                p_formation_id,
                SYSTEM_USER_ID,
                p_user_id,
                '🎉 Félicitations ! Vous avez terminé cette leçon et débloqué la suivante : "' || next_lesson_title || '"',
                'system',
                true
            );
        END IF;
    ELSE
        -- Message de félicitations pour la fin du niveau
        INSERT INTO lesson_messages (
            lesson_id,
            formation_id,
            sender_id,
            receiver_id,
            content,
            message_type,
            is_system_message
        ) VALUES (
            p_lesson_id,
            p_formation_id,
            SYSTEM_USER_ID,
            p_user_id,
            '🏆 Bravo ! Vous avez terminé toutes les leçons de ce niveau !',
            'system',
            true
        );
    END IF;
  ELSE
    -- Il reste des exercices dans cette leçon
    IF current_index IS NOT NULL AND current_index < array_length(all_ids, 1) THEN
        -- Prochain exercice dans la même leçon
        next_exercise_id := all_ids[current_index + 1];

        -- Récupérer le titre de l'exercice
        SELECT title INTO exercise_title FROM exercises WHERE id = next_exercise_id;

        -- Message système pour le prochain exercice
        INSERT INTO lesson_messages (
            lesson_id, 
            formation_id, 
            sender_id, 
            receiver_id,
            content, 
            message_type, 
            is_system_message, 
            exercise_id
        ) VALUES (
            p_lesson_id, 
            p_formation_id, 
            SYSTEM_USER_ID, 
            p_user_id,
            '✅ Bien joué ! Voici ton prochain exercice : ' || COALESCE(exercise_title, 'Exercice suivant'),
            'system', 
            true, 
            next_exercise_id
        );
    END IF;
  END IF;
END;
$$;
