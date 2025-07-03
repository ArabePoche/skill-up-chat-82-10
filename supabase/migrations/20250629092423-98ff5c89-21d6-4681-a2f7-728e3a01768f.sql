
-- Supprimer les trois fonctions récemment créées
DROP FUNCTION IF EXISTS public.insert_initial_lesson_progress(UUID, UUID);
DROP FUNCTION IF EXISTS public.send_welcome_message_with_first_exercise(UUID, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.approve_enrollment(UUID, UUID, UUID);

-- Supprimer le trigger existant
DROP TRIGGER IF EXISTS trigger_handle_enrollment_approval ON public.enrollment_requests;
DROP FUNCTION IF EXISTS public.handle_enrollment_approval();

-- Créer une fonction simple pour l'approbation et notification uniquement
CREATE OR REPLACE FUNCTION public.handle_enrollment_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    formation_title TEXT;
BEGIN
    RAISE NOTICE 'TRIGGER CALLED: status changed from % to % for user % formation %', OLD.status, NEW.status, NEW.user_id, NEW.formation_id;
    
    -- Quand une inscription est approuvée
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        RAISE NOTICE 'Processing enrollment approval for user % in formation %', NEW.user_id, NEW.formation_id;
        
        -- Récupérer le titre de la formation
        SELECT title INTO formation_title FROM formations WHERE id = NEW.formation_id;
        
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
        
        RAISE NOTICE 'Approval notification created for user %', NEW.user_id;
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
        RETURN NEW;
END;
$$;

-- Recréer le trigger
CREATE TRIGGER trigger_handle_enrollment_approval
    AFTER UPDATE ON public.enrollment_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_enrollment_approval();
