
-- Fonction pour déverrouiller automatiquement la prochaine leçon
CREATE OR REPLACE FUNCTION public.unlock_next_lesson()
RETURNS TRIGGER AS $$
DECLARE
    current_lesson_id UUID;
    current_level_id UUID;
    next_lesson_id UUID;
    total_exercises INTEGER;
    completed_exercises INTEGER;
    is_last_exercise BOOLEAN := FALSE;
BEGIN
    -- Si l'exercice n'est pas marqué comme complété, ne rien faire
    IF NEW.exercise_completed != TRUE THEN
        RETURN NEW;
    END IF;

    -- Récupérer l'ID de la leçon depuis l'exercice
    SELECT lesson_id INTO current_lesson_id
    FROM exercises 
    WHERE id = NEW.exercise_id;

    -- Vérifier si c'est le dernier exercice de la leçon à être complété
    SELECT COUNT(*) INTO total_exercises
    FROM exercises e
    WHERE e.lesson_id = current_lesson_id;

    SELECT COUNT(*) INTO completed_exercises
    FROM exercise_submissions es
    JOIN exercises e ON es.exercise_id = e.id
    WHERE e.lesson_id = current_lesson_id 
    AND es.user_id = NEW.user_id 
    AND es.status = 'approved';

    -- Si tous les exercices sont complétés, marquer la leçon comme terminée
    IF completed_exercises >= total_exercises THEN
        -- Insérer ou mettre à jour le progrès de la leçon courante
        INSERT INTO user_lesson_progress (user_id, lesson_id, status, exercise_completed)
        VALUES (NEW.user_id, current_lesson_id, 'completed', TRUE)
        ON CONFLICT (user_id, lesson_id) 
        DO UPDATE SET 
            status = 'completed',
            exercise_completed = TRUE,
            completed_at = NOW();

        -- Récupérer le level_id de la leçon courante
        SELECT level_id INTO current_level_id
        FROM lessons 
        WHERE id = current_lesson_id;

        -- Trouver la prochaine leçon dans le même niveau
        SELECT id INTO next_lesson_id
        FROM lessons
        WHERE level_id = current_level_id 
        AND order_index > (
            SELECT order_index 
            FROM lessons 
            WHERE id = current_lesson_id
        )
        ORDER BY order_index ASC
        LIMIT 1;

        -- Si une prochaine leçon existe, la déverrouiller
        IF next_lesson_id IS NOT NULL THEN
            INSERT INTO user_lesson_progress (user_id, lesson_id, status, exercise_completed)
            VALUES (NEW.user_id, next_lesson_id, 'unlocked', FALSE)
            ON CONFLICT (user_id, lesson_id) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger sur exercise_submissions
DROP TRIGGER IF EXISTS trigger_unlock_next_lesson ON exercise_submissions;
CREATE TRIGGER trigger_unlock_next_lesson
    AFTER UPDATE ON exercise_submissions
    FOR EACH ROW
    WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
    EXECUTE FUNCTION unlock_next_lesson();

-- Fonction pour initialiser la première leçon de chaque formation pour un utilisateur
CREATE OR REPLACE FUNCTION public.initialize_first_lessons_for_user(p_user_id UUID, p_formation_id UUID)
RETURNS VOID AS $$
DECLARE
    level_record RECORD;
    first_lesson_id UUID;
BEGIN
    -- Pour chaque niveau de la formation
    FOR level_record IN 
        SELECT id FROM levels 
        WHERE formation_id = p_formation_id 
        ORDER BY order_index ASC
    LOOP
        -- Récupérer la première leçon du niveau
        SELECT id INTO first_lesson_id
        FROM lessons
        WHERE level_id = level_record.id
        ORDER BY order_index ASC
        LIMIT 1;

        -- Si c'est le premier niveau, déverrouiller la première leçon
        IF level_record = (
            SELECT ROW(id) FROM levels 
            WHERE formation_id = p_formation_id 
            ORDER BY order_index ASC 
            LIMIT 1
        ) THEN
            INSERT INTO user_lesson_progress (user_id, lesson_id, status, exercise_completed)
            VALUES (p_user_id, first_lesson_id, 'unlocked', FALSE)
            ON CONFLICT (user_id, lesson_id) DO NOTHING;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour initialiser automatiquement les premières leçons lors d'une inscription
CREATE OR REPLACE FUNCTION public.auto_initialize_lessons()
RETURNS TRIGGER AS $$
BEGIN
    -- Quand une demande d'inscription est approuvée
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        PERFORM initialize_first_lessons_for_user(NEW.user_id, NEW.formation_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_initialize_lessons ON enrollment_requests;
CREATE TRIGGER trigger_auto_initialize_lessons
    AFTER UPDATE ON enrollment_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_initialize_lessons();

-- Ajouter une contrainte unique sur user_lesson_progress si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_lesson_progress_user_lesson_unique'
    ) THEN
        ALTER TABLE user_lesson_progress 
        ADD CONSTRAINT user_lesson_progress_user_lesson_unique 
        UNIQUE (user_id, lesson_id);
    END IF;
END $$;
