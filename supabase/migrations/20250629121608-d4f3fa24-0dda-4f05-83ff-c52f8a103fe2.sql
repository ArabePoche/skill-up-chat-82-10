
-- Mettre à jour la fonction pour utiliser le bon ID système
CREATE OR REPLACE FUNCTION public.handle_enrollment_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    formation_title TEXT;
    first_lesson_id UUID;
    first_exercise_id UUID;
BEGIN
    -- Quand une inscription est approuvée
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        
        -- Récupérer le titre de la formation
        SELECT title INTO formation_title FROM formations WHERE id = NEW.formation_id;
        
        -- Récupérer la première leçon de la formation
        SELECT l.id INTO first_lesson_id
        FROM lessons l
        JOIN levels lv ON l.level_id = lv.id
        WHERE lv.formation_id = NEW.formation_id
        ORDER BY lv.order_index ASC, l.order_index ASC
        LIMIT 1;

        -- Si une première leçon existe, l'initialiser pour l'utilisateur
        IF first_lesson_id IS NOT NULL THEN
            -- Créer le progrès de la première leçon
            INSERT INTO user_lesson_progress (user_id, lesson_id, status, exercise_completed)
            VALUES (NEW.user_id, first_lesson_id, 'not_started', FALSE)
            ON CONFLICT (user_id, lesson_id) DO NOTHING;

            -- Récupérer le premier exercice
            SELECT id INTO first_exercise_id
            FROM exercises
            WHERE lesson_id = first_lesson_id
            ORDER BY created_at ASC
            LIMIT 1;

            -- Créer le message de bienvenue
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
                    '4c32c988-3b19-4eca-87cb-0e0595fd7fbb'::uuid,
                    NEW.user_id,
                    'Bienvenue dans la formation "' || COALESCE(formation_title, 'Formation') || '" ! 🎉' || E'\n\n' ||
                    'Félicitations ! Votre inscription a été approuvée. Vous pouvez maintenant commencer votre parcours d''apprentissage.' || E'\n\n' ||
                    'Voici votre premier exercice pour débuter.',
                    'system',
                    TRUE,
                    first_exercise_id
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
                    first_lesson_id,
                    NEW.formation_id,
                    '4c32c988-3b19-4eca-87cb-0e0595fd7fbb'::uuid,
                    NEW.user_id,
                    'Bienvenue dans la formation "' || COALESCE(formation_title, 'Formation') || '" ! 🎉' || E'\n\n' ||
                    'Félicitations ! Votre inscription a été approuvée. Vous pouvez maintenant commencer votre parcours d''apprentissage.',
                    'system',
                    TRUE
                );
            END IF;
        END IF;
        
        -- Créer une notification pour l'utilisateur
        INSERT INTO public.notifications (
            title,
            message,
            type,
            user_id,
            enrollment_id
        ) VALUES (
            'Inscription approuvée ! 🎉',
            'Félicitations ! Votre inscription à la formation "' || COALESCE(formation_title, 'Formation') || '" a été approuvée. Vous pouvez maintenant accéder à vos cours.',
            'enrollment',
            NEW.user_id,
            NEW.id
        );
    END IF;
    
    -- Si l'inscription est rejetée
    IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        SELECT title INTO formation_title FROM formations WHERE id = NEW.formation_id;
        
        INSERT INTO public.notifications (
            title,
            message,
            type,
            user_id,
            enrollment_id
        ) VALUES (
            'Inscription rejetée',
            CASE 
                WHEN NEW.rejected_reason IS NOT NULL THEN 
                    'Votre demande d''inscription à la formation "' || COALESCE(formation_title, 'Formation') || '" a été rejetée.' || E'\n\nRaison: ' || NEW.rejected_reason
                ELSE 
                    'Votre demande d''inscription à la formation "' || COALESCE(formation_title, 'Formation') || '" a été rejetée.'
            END,
            'enrollment',
            NEW.user_id,
            NEW.id
        );
    END IF;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        -- En cas d'erreur, ne pas bloquer l'approbation mais logger l'erreur
        RAISE WARNING 'Erreur dans handle_enrollment_approval: %', SQLERRM;
        RETURN NEW;
END;
$$;
