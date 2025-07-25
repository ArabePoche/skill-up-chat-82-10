
-- Corriger le trigger pour utiliser la fonction initialize_user_lessons
DROP TRIGGER IF EXISTS trigger_handle_enrollment_approval ON public.enrollment_requests;
DROP FUNCTION IF EXISTS public.handle_enrollment_approval();

-- Recréer la fonction handle_enrollment_approval pour utiliser initialize_user_lessons
CREATE OR REPLACE FUNCTION public.handle_enrollment_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    formation_title TEXT;
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
        
        -- Utiliser la fonction initialize_user_lessons pour initialiser les leçons
        PERFORM public.initialize_user_lessons(NEW.user_id, NEW.formation_id);
        
        RAISE NOTICE 'Lessons initialized using initialize_user_lessons function for user %', NEW.user_id;
        
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
