
-- Corriger le trigger pour s'assurer qu'il initialise correctement les leçons
DROP TRIGGER IF EXISTS trigger_handle_enrollment_approval ON public.enrollment_requests;
DROP FUNCTION IF EXISTS public.handle_enrollment_approval();

-- Recréer la fonction avec plus de vérifications et de logs
CREATE OR REPLACE FUNCTION public.handle_enrollment_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    first_lesson_id UUID;
    first_exercise_id UUID;
    formation_title TEXT;
    level_count INTEGER;
    lesson_count INTEGER;
BEGIN
    -- Log au début pour vérifier que le trigger se déclenche
    RAISE NOTICE 'TRIGGER CALLED: status changed from % to % for user % formation %', OLD.status, NEW.status, NEW.user_id, NEW.formation_id;
    
    -- Quand une inscription est approuvée
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        
        RAISE NOTICE 'Processing enrollment approval for user % in formation %', NEW.user_id, NEW.formation_id;
        
        -- Vérifier que la formation existe et récupérer son titre
        SELECT title INTO formation_title FROM formations WHERE id = NEW.formation_id;
        IF formation_title IS NULL THEN
            RAISE WARNING 'Formation % not found', NEW.formation_id;
            RETURN NEW;
        END IF;
        
        RAISE NOTICE 'Formation found: %', formation_title;
        
        -- Compter les niveaux de la formation
        SELECT COUNT(*) INTO level_count FROM levels WHERE formation_id = NEW.formation_id;
        RAISE NOTICE 'Found % levels in formation %', level_count, NEW.formation_id;
        
        -- Récupérer la première leçon de la formation
        SELECT l.id INTO first_lesson_id
        FROM lessons l
        JOIN levels lv ON l.level_id = lv.id
        WHERE lv.formation_id = NEW.formation_id
        ORDER BY lv.order_index ASC, l.order_index ASC
        LIMIT 1;

        IF first_lesson_id IS NOT NULL THEN
            RAISE NOTICE 'First lesson found: %', first_lesson_id;
            
            -- Vérifier si un progrès existe déjà
            SELECT COUNT(*) INTO lesson_count FROM user_lesson_progress 
            WHERE user_id = NEW.user_id AND lesson_id = first_lesson_id;
            
            RAISE NOTICE 'Existing progress count for this lesson: %', lesson_count;
            
            -- Insérer le progrès de la leçon
            INSERT INTO user_lesson_progress (user_id, lesson_id, status, exercise_completed)
            VALUES (NEW.user_id, first_lesson_id, 'not_started', FALSE)
            ON CONFLICT (user_id, lesson_id) DO UPDATE SET
                status = 'not_started',
                exercise_completed = FALSE;
            
            RAISE NOTICE 'Lesson progress inserted/updated for lesson % user %', first_lesson_id, NEW.user_id;

            -- Récupérer le premier exercice de cette leçon
            SELECT id INTO first_exercise_id
            FROM exercises
            WHERE lesson_id = first_lesson_id
            ORDER BY created_at ASC
            LIMIT 1;

            IF first_exercise_id IS NOT NULL THEN
                RAISE NOTICE 'First exercise found: %', first_exercise_id;
                
                -- Créer le message de bienvenue avec le premier exercice
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
                
                RAISE NOTICE 'Welcome message with exercise created for user %', NEW.user_id;
            ELSE
                RAISE NOTICE 'No exercise found for lesson %, creating message without exercise', first_lesson_id;
                
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
                
                RAISE NOTICE 'Welcome message without exercise created for user %', NEW.user_id;
            END IF;
        ELSE
            RAISE NOTICE 'No lessons found for formation % - this is normal for formations without lessons', NEW.formation_id;
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
        
        RAISE NOTICE 'Notification created for user %', NEW.user_id;
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
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_enrollment_approval: % - SQLSTATE: %', SQLERRM, SQLSTATE;
        -- Continuer même en cas d'erreur pour ne pas bloquer l'approbation
        RETURN NEW;
END;
$$;

-- Créer le trigger pour gérer l'approbation des inscriptions
CREATE TRIGGER trigger_handle_enrollment_approval
    AFTER UPDATE ON public.enrollment_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_enrollment_approval();
