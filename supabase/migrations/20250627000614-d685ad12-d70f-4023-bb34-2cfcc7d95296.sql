
-- Supprimer la table obsolète exercise_submissions
DROP TABLE IF EXISTS public.exercise_submissions;

-- Modifier la table lesson_messages pour ajouter les nouvelles colonnes
ALTER TABLE public.lesson_messages
  ADD COLUMN IF NOT EXISTS exercise_id UUID REFERENCES exercises(id);

-- Créer une fonction pour initialiser la première leçon lors de l'approbation d'une inscription
CREATE OR REPLACE FUNCTION public.initialize_first_lesson_on_enrollment()
RETURNS TRIGGER AS $$
DECLARE
    first_lesson_id UUID;
    first_exercise_id UUID;
BEGIN
    -- Quand une demande d'inscription est approuvée
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Récupérer la première leçon de la formation
        SELECT l.id INTO first_lesson_id
        FROM lessons l
        JOIN levels lv ON l.level_id = lv.id
        WHERE lv.formation_id = NEW.formation_id
        ORDER BY lv.order_index ASC, l.order_index ASC
        LIMIT 1;

        -- Ajouter la première leçon dans user_lesson_progress
        INSERT INTO user_lesson_progress (user_id, lesson_id, status, exercise_completed)
        VALUES (NEW.user_id, first_lesson_id, 'unlocked', FALSE)
        ON CONFLICT (user_id, lesson_id) DO NOTHING;

        -- Récupérer le premier exercice de cette leçon
        SELECT id INTO first_exercise_id
        FROM exercises
        WHERE lesson_id = first_lesson_id
        ORDER BY created_at ASC
        LIMIT 1;

        -- Ajouter le premier exercice dans lesson_messages
        IF first_exercise_id IS NOT NULL THEN
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
                first_lesson_id,
                NEW.formation_id,
                'system',
                NEW.user_id,
                'Voici votre premier exercice ! Lisez attentivement les instructions et soumettez votre travail.',
                'system',
                TRUE,
                first_exercise_id
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger pour l'initialisation des leçons
DROP TRIGGER IF EXISTS trigger_initialize_first_lesson ON enrollment_requests;
CREATE TRIGGER trigger_initialize_first_lesson
    AFTER UPDATE ON enrollment_requests
    FOR EACH ROW
    EXECUTE FUNCTION initialize_first_lesson_on_enrollment();

-- Créer une fonction pour gérer la validation des exercices et l'envoi automatique du suivant
CREATE OR REPLACE FUNCTION public.handle_exercise_validation()
RETURNS TRIGGER AS $$
DECLARE
    next_exercise_id UUID;
    next_lesson_id UUID;
    current_lesson_id UUID;
    formation_id UUID;
    student_id UUID;
    exercise_title TEXT;
    exercise_description TEXT;
    exercise_content TEXT;
BEGIN
    -- Quand un exercice est validé (status passe à 'approved')
    IF NEW.exercise_status = 'approved' AND OLD.exercise_status != 'approved' AND NEW.exercise_id IS NOT NULL THEN
        
        -- Récupérer les informations nécessaires
        current_lesson_id := NEW.lesson_id;
        formation_id := NEW.formation_id;
        student_id := NEW.receiver_id;

        -- Chercher le prochain exercice dans la même leçon
        SELECT id INTO next_exercise_id
        FROM exercises
        WHERE lesson_id = current_lesson_id
        AND id > NEW.exercise_id
        ORDER BY created_at ASC
        LIMIT 1;

        IF next_exercise_id IS NOT NULL THEN
            -- Il y a un prochain exercice dans la même leçon
            SELECT title, description, content INTO exercise_title, exercise_description, exercise_content
            FROM exercises
            WHERE id = next_exercise_id;

            -- Envoyer le prochain exercice
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
                current_lesson_id,
                formation_id,
                'system',
                student_id,
                'Excellent travail ! Voici l''exercice suivant : ' || COALESCE(exercise_title, 'Exercice') || 
                CASE 
                    WHEN exercise_description IS NOT NULL THEN E'\n\nDescription : ' || exercise_description
                    ELSE ''
                END ||
                CASE 
                    WHEN exercise_content IS NOT NULL THEN E'\n\nInstructions : ' || exercise_content
                    ELSE ''
                END,
                'system',
                TRUE,
                next_exercise_id
            );
        ELSE
            -- C'est le dernier exercice de la leçon, déverrouiller la leçon suivante
            SELECT l.id INTO next_lesson_id
            FROM lessons l
            JOIN lessons current_l ON l.level_id = current_l.level_id
            WHERE current_l.id = current_lesson_id
            AND l.order_index > current_l.order_index
            ORDER BY l.order_index ASC
            LIMIT 1;

            -- Marquer la leçon actuelle comme terminée
            UPDATE user_lesson_progress
            SET status = 'completed', exercise_completed = TRUE, completed_at = NOW()
            WHERE user_id = student_id AND lesson_id = current_lesson_id;

            IF next_lesson_id IS NOT NULL THEN
                -- Déverrouiller la leçon suivante
                INSERT INTO user_lesson_progress (user_id, lesson_id, status, exercise_completed)
                VALUES (student_id, next_lesson_id, 'unlocked', FALSE)
                ON CONFLICT (user_id, lesson_id) DO NOTHING;

                -- Récupérer le premier exercice de la nouvelle leçon
                SELECT id INTO next_exercise_id
                FROM exercises
                WHERE lesson_id = next_lesson_id
                ORDER BY created_at ASC
                LIMIT 1;

                -- Envoyer un message de félicitations et le premier exercice de la nouvelle leçon
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
                    next_lesson_id,
                    formation_id,
                    'system',
                    student_id,
                    '🎉 Félicitations ! Vous avez terminé cette leçon. La leçon suivante est maintenant déverrouillée !',
                    'system',
                    TRUE,
                    next_exercise_id
                );
            ELSE
                -- C'est la dernière leçon, envoyer un message de fin de formation
                INSERT INTO lesson_messages (
                    lesson_id,
                    formation_id,
                    sender_id,
                    receiver_id,
                    content,
                    message_type,
                    is_system_message
                ) VALUES (
                    current_lesson_id,
                    formation_id,
                    'system',
                    student_id,
                    '🎓 Incroyable ! Vous avez terminé toute la formation ! Félicitations pour votre persévérance et votre excellent travail.',
                    'system',
                    TRUE
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger pour la validation des exercices
DROP TRIGGER IF EXISTS trigger_handle_exercise_validation ON lesson_messages;
CREATE TRIGGER trigger_handle_exercise_validation
    AFTER UPDATE ON lesson_messages
    FOR EACH ROW
    EXECUTE FUNCTION handle_exercise_validation();
