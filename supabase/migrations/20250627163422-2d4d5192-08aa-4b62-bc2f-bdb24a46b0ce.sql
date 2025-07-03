
-- Supprimer les triggers existants
DROP TRIGGER IF EXISTS trigger_auto_initialize_lessons ON public.enrollment_requests;
DROP TRIGGER IF EXISTS trigger_initialize_first_lesson ON public.enrollment_requests;
DROP TRIGGER IF EXISTS trigger_handle_exercise_validation ON public.lesson_messages;

-- Supprimer les fonctions existantes
DROP FUNCTION IF EXISTS public.auto_initialize_lessons();
DROP FUNCTION IF EXISTS public.initialize_first_lesson_on_enrollment();
DROP FUNCTION IF EXISTS public.initialize_first_lessons_for_user(uuid, uuid);
DROP FUNCTION IF EXISTS public.handle_exercise_validation();

-- Nettoyer la table enrollment_requests
TRUNCATE TABLE public.enrollment_requests RESTART IDENTITY CASCADE;

-- Simplifier la table enrollment_requests
ALTER TABLE public.enrollment_requests 
DROP COLUMN IF EXISTS admin_notes;

-- Ajouter une colonne pour les notes de rejet si nécessaire
ALTER TABLE public.enrollment_requests 
ADD COLUMN IF NOT EXISTS rejected_reason text;

-- Fonction simple pour initialiser les leçons après approbation
CREATE OR REPLACE FUNCTION public.initialize_user_lessons(p_user_id uuid, p_formation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    first_lesson_id UUID;
    first_exercise_id UUID;
BEGIN
    -- Récupérer la première leçon de la formation
    SELECT l.id INTO first_lesson_id
    FROM lessons l
    JOIN levels lv ON l.level_id = lv.id
    WHERE lv.formation_id = p_formation_id
    ORDER BY lv.order_index ASC, l.order_index ASC
    LIMIT 1;

    -- Si une première leçon existe, la déverrouiller
    IF first_lesson_id IS NOT NULL THEN
        INSERT INTO user_lesson_progress (user_id, lesson_id, status, exercise_completed)
        VALUES (p_user_id, first_lesson_id, 'unlocked', FALSE)
        ON CONFLICT (user_id, lesson_id) DO NOTHING;

        -- Récupérer le premier exercice de cette leçon
        SELECT id INTO first_exercise_id
        FROM exercises
        WHERE lesson_id = first_lesson_id
        ORDER BY created_at ASC
        LIMIT 1;

        -- Ajouter un message de bienvenue avec le premier exercice
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
                p_formation_id,
                '00000000-0000-0000-0000-000000000000'::uuid,
                p_user_id,
                'Bienvenue dans cette formation ! Voici votre premier exercice.',
                'system',
                TRUE,
                first_exercise_id
            );
        END IF;
    END IF;
END;
$$;

-- Trigger simple pour l'initialisation des leçons
CREATE OR REPLACE FUNCTION public.handle_enrollment_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Quand une inscription est approuvée
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Initialiser les leçons pour l'utilisateur
        PERFORM public.initialize_user_lessons(NEW.user_id, NEW.formation_id);
        
        -- Créer une notification pour l'utilisateur
        INSERT INTO public.notifications (
            title,
            message,
            type,
            user_id,
            enrollment_id
        ) VALUES (
            'Inscription approuvée',
            'Félicitations ! Votre inscription a été approuvée. Vous pouvez maintenant accéder à votre formation.',
            'enrollment',
            NEW.user_id,
            NEW.id
        );
    END IF;
    
    -- Si l'inscription est rejetée
    IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        INSERT INTO public.notifications (
            title,
            message,
            type,
            user_id,
            enrollment_id
        ) VALUES (
            'Inscription rejetée',
            COALESCE('Votre demande d''inscription a été rejetée. Raison: ' || NEW.rejected_reason, 'Votre demande d''inscription a été rejetée.'),
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

-- Nettoyer les notifications existantes liées aux inscriptions
DELETE FROM public.notifications WHERE type = 'enrollment_request' OR type = 'enrollment';
