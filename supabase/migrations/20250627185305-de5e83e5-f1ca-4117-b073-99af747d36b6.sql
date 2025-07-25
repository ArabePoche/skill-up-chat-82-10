
-- Vérifier et corriger le trigger d'initialisation des leçons
-- D'abord, supprimer les anciens triggers et fonctions pour éviter les conflits
DROP TRIGGER IF EXISTS trigger_handle_enrollment_approval ON public.enrollment_requests;
DROP FUNCTION IF EXISTS public.handle_enrollment_approval();

-- Recréer la fonction d'initialisation des leçons avec une meilleure gestion d'erreurs
CREATE OR REPLACE FUNCTION public.handle_enrollment_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    first_lesson_id UUID;
    first_exercise_id UUID;
    formation_title TEXT;
BEGIN
    -- Quand une inscription est approuvée
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        
        -- Log pour déboguer
        RAISE NOTICE 'Processing enrollment approval for user % in formation %', NEW.user_id, NEW.formation_id;
        
        -- Récupérer le titre de la formation pour les messages
        SELECT title INTO formation_title FROM formations WHERE id = NEW.formation_id;
        
        -- Récupérer la première leçon de la formation
        SELECT l.id INTO first_lesson_id
        FROM lessons l
        JOIN levels lv ON l.level_id = lv.id
        WHERE lv.formation_id = NEW.formation_id
        ORDER BY lv.order_index ASC, l.order_index ASC
        LIMIT 1;

        -- Si une première leçon existe, la déverrouiller
        IF first_lesson_id IS NOT NULL THEN
            -- Insérer le progrès de la leçon
            INSERT INTO user_lesson_progress (user_id, lesson_id, status, exercise_completed)
            VALUES (NEW.user_id, first_lesson_id, 'unlocked', FALSE)
            ON CONFLICT (user_id, lesson_id) DO NOTHING;
            
            RAISE NOTICE 'Unlocked first lesson % for user %', first_lesson_id, NEW.user_id;

            -- Récupérer le premier exercice de cette leçon
            SELECT id INTO first_exercise_id
            FROM exercises
            WHERE lesson_id = first_lesson_id
            ORDER BY created_at ASC
            LIMIT 1;

            -- Créer le message de bienvenue avec le premier exercice
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
                    '00000000-0000-0000-0000-000000000000'::uuid,
                    NEW.user_id,
                    'Bienvenue dans la formation "' || COALESCE(formation_title, 'Formation') || '" ! 🎉' || E'\n\n' ||
                    'Félicitations ! Votre inscription a été approuvée. Vous pouvez maintenant commencer votre parcours d''apprentissage.' || E'\n\n' ||
                    'Voici votre premier exercice pour débuter. Prenez le temps de bien lire les instructions avant de commencer.',
                    'system',
                    TRUE,
                    first_exercise_id
                );
                
                RAISE NOTICE 'Created welcome message with exercise % for user %', first_exercise_id, NEW.user_id;
            ELSE
                -- Message de bienvenue sans exercice
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
                    '00000000-0000-0000-0000-000000000000'::uuid,
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
        -- Récupérer le titre de la formation
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
END;
$$;

-- Créer le trigger pour gérer l'approbation des inscriptions
CREATE TRIGGER trigger_handle_enrollment_approval
    AFTER UPDATE ON public.enrollment_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_enrollment_approval();
