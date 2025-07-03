
-- Supprimer l'ancienne fonction et trigger
DROP TRIGGER IF EXISTS trigger_handle_enrollment_approval ON public.enrollment_requests;
DROP FUNCTION IF EXISTS public.handle_enrollment_approval();

-- Fonction 1: Insérer la première leçon dans user_lesson_progress
CREATE OR REPLACE FUNCTION public.insert_initial_lesson_progress(
    p_user_id UUID,
    p_formation_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    first_lesson_id UUID;
BEGIN
    RAISE NOTICE 'Starting insert_initial_lesson_progress for user % and formation %', p_user_id, p_formation_id;
    
    -- Récupérer la première leçon de la formation
    SELECT l.id INTO first_lesson_id
    FROM lessons l
    JOIN levels lv ON l.level_id = lv.id
    WHERE lv.formation_id = p_formation_id
    ORDER BY lv.order_index ASC, l.order_index ASC
    LIMIT 1;
    
    IF first_lesson_id IS NULL THEN
        RAISE WARNING 'No first lesson found for formation %', p_formation_id;
        RETURN NULL;
    END IF;
    
    RAISE NOTICE 'First lesson found: %', first_lesson_id;
    
    -- Insérer le progrès de la première leçon
    INSERT INTO user_lesson_progress (user_id, lesson_id, status, exercise_completed)
    VALUES (p_user_id, first_lesson_id, 'not_started', FALSE)
    ON CONFLICT (user_id, lesson_id) DO UPDATE SET
        status = 'not_started',
        exercise_completed = FALSE;
    
    RAISE NOTICE 'Lesson progress created for lesson % and user %', first_lesson_id, p_user_id;
    
    RETURN first_lesson_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in insert_initial_lesson_progress: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- Fonction 2: Créer le message de bienvenue avec le premier exercice
CREATE OR REPLACE FUNCTION public.send_welcome_message_with_first_exercise(
    p_user_id UUID,
    p_formation_id UUID,
    p_lesson_id UUID,
    p_formation_title TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    first_exercise_id UUID;
    SYSTEM_USER_ID CONSTANT UUID := '4c32c988-3b19-4eca-87cb-0e0595fd7fbb';
BEGIN
    RAISE NOTICE 'Starting send_welcome_message_with_first_exercise for user % in formation %', p_user_id, p_formation_id;
    
    -- Récupérer le premier exercice de la leçon
    SELECT id INTO first_exercise_id
    FROM exercises
    WHERE lesson_id = p_lesson_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF first_exercise_id IS NOT NULL THEN
        RAISE NOTICE 'First exercise found: %', first_exercise_id;
        
        -- Créer le message de bienvenue avec exercice
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
            'Bienvenue dans la formation "' || COALESCE(p_formation_title, 'Formation') || '" ! 🎉' || E'\n\n' ||
            'Félicitations ! Votre inscription a été approuvée. Vous pouvez maintenant commencer votre parcours d''apprentissage.' || E'\n\n' ||
            'Voici votre premier exercice pour débuter. Prenez le temps de bien lire les instructions avant de commencer.',
            'system',
            TRUE,
            first_exercise_id
        );
        
        RAISE NOTICE 'Welcome message with exercise created for user %', p_user_id;
    ELSE
        RAISE NOTICE 'No exercise found for lesson %, creating message without exercise', p_lesson_id;
        
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
            p_lesson_id,
            p_formation_id,
            SYSTEM_USER_ID,
            p_user_id,
            'Bienvenue dans la formation "' || COALESCE(p_formation_title, 'Formation') || '" ! 🎉' || E'\n\n' ||
            'Félicitations ! Votre inscription a été approuvée. Vous pouvez maintenant commencer votre parcours d''apprentissage.',
            'system',
            TRUE
        );
        
        RAISE NOTICE 'Welcome message without exercise created for user %', p_user_id;
    END IF;
    
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in send_welcome_message_with_first_exercise: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Fonction 3: Fonction principale pour approuver une inscription
CREATE OR REPLACE FUNCTION public.approve_enrollment(
    p_user_id UUID,
    p_formation_id UUID,
    p_enrollment_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    formation_title TEXT;
    first_lesson_id UUID;
    welcome_message_success BOOLEAN;
BEGIN
    RAISE NOTICE 'Starting approve_enrollment for user % in formation %', p_user_id, p_formation_id;
    
    -- Étape 1: Vérifier que la formation existe et récupérer son titre
    SELECT title INTO formation_title FROM formations WHERE id = p_formation_id;
    IF formation_title IS NULL THEN
        RAISE WARNING 'Formation % not found', p_formation_id;
        RETURN FALSE;
    END IF;
    
    RAISE NOTICE 'Formation found: %', formation_title;
    
    -- Étape 2: Insérer la première leçon dans user_lesson_progress
    SELECT public.insert_initial_lesson_progress(p_user_id, p_formation_id) INTO first_lesson_id;
    
    IF first_lesson_id IS NULL THEN
        RAISE WARNING 'Failed to initialize lesson progress for user %', p_user_id;
        -- Continuer quand même pour créer la notification
    ELSE
        -- Étape 3: Envoyer le message de bienvenue avec le premier exercice
        SELECT public.send_welcome_message_with_first_exercise(
            p_user_id, 
            p_formation_id, 
            first_lesson_id, 
            formation_title
        ) INTO welcome_message_success;
        
        IF NOT welcome_message_success THEN
            RAISE WARNING 'Failed to send welcome message for user %', p_user_id;
        END IF;
    END IF;
    
    -- Étape 4: Créer une notification pour l'utilisateur
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
        p_user_id,
        p_enrollment_id
    );
    
    RAISE NOTICE 'Notification created for user %', p_user_id;
    RAISE NOTICE 'Enrollment approval completed successfully for user %', p_user_id;
    
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in approve_enrollment: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Fonction principale du trigger (refactorisée)
CREATE OR REPLACE FUNCTION public.handle_enrollment_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    formation_title TEXT;
    approval_success BOOLEAN;
BEGIN
    RAISE NOTICE 'TRIGGER CALLED: status changed from % to % for user % formation %', OLD.status, NEW.status, NEW.user_id, NEW.formation_id;
    
    -- Quand une inscription est approuvée
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        RAISE NOTICE 'Processing enrollment approval for user % in formation %', NEW.user_id, NEW.formation_id;
        
        -- Appeler la fonction principale d'approbation
        SELECT public.approve_enrollment(NEW.user_id, NEW.formation_id, NEW.id) INTO approval_success;
        
        IF NOT approval_success THEN
            RAISE WARNING 'Enrollment approval process failed for user % in formation %', NEW.user_id, NEW.formation_id;
        END IF;
    END IF;
    
    -- Si l'inscription est rejetée
    IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        RAISE NOTICE 'Processing enrollment rejection for user % in formation %', NEW.user_id, NEW.formation_id;
        
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
        
        RAISE NOTICE 'Rejection notification created for user %', NEW.user_id;
    END IF;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_enrollment_approval trigger: % - SQLSTATE: %', SQLERRM, SQLSTATE;
        -- Continuer même en cas d'erreur pour ne pas bloquer l'approbation
        RETURN NEW;
END;
$$;

-- Recréer le trigger
CREATE TRIGGER trigger_handle_enrollment_approval
    AFTER UPDATE ON public.enrollment_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_enrollment_approval();
