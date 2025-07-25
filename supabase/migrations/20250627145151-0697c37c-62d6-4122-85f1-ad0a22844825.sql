
-- Supprimer l'ancienne fonction avant de la recréer avec un nouveau type de retour
DROP FUNCTION IF EXISTS public.initialize_first_lessons_for_user(uuid, uuid);

-- Recréer la fonction avec le bon type de retour et une meilleure gestion d'erreurs
CREATE OR REPLACE FUNCTION public.initialize_first_lessons_for_user(p_user_id uuid, p_formation_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    level_record RECORD;
    first_lesson_id UUID;
    first_exercise_id UUID;
    result_data json;
    lessons_initialized INTEGER := 0;
    exercises_initialized INTEGER := 0;
BEGIN
    -- Vérifier que la formation existe et est active
    IF NOT EXISTS (SELECT 1 FROM formations WHERE id = p_formation_id AND is_active = true) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Formation not found or inactive',
            'formation_id', p_formation_id
        );
    END IF;

    -- Vérifier que l'utilisateur existe
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found',
            'user_id', p_user_id
        );
    END IF;

    -- Pour chaque niveau de la formation (dans l'ordre)
    FOR level_record IN 
        SELECT id, title FROM levels 
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
            SELECT ROW(id, title) FROM levels 
            WHERE formation_id = p_formation_id 
            ORDER BY order_index ASC 
            LIMIT 1
        ) AND first_lesson_id IS NOT NULL THEN
            -- Insérer le progrès de la leçon
            INSERT INTO user_lesson_progress (user_id, lesson_id, status, exercise_completed)
            VALUES (p_user_id, first_lesson_id, 'unlocked', FALSE)
            ON CONFLICT (user_id, lesson_id) DO NOTHING;
            
            lessons_initialized := lessons_initialized + 1;

            -- Récupérer le premier exercice de cette leçon
            SELECT id INTO first_exercise_id
            FROM exercises
            WHERE lesson_id = first_lesson_id
            ORDER BY created_at ASC
            LIMIT 1;

            -- Créer le message d'accueil avec le premier exercice
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
                    '00000000-0000-0000-0000-000000000000'::uuid, -- ID système
                    p_user_id,
                    'Bienvenue dans cette formation ! Voici votre premier exercice. Lisez attentivement les instructions et soumettez votre travail.',
                    'system',
                    TRUE,
                    first_exercise_id
                );
                
                exercises_initialized := exercises_initialized + 1;
            END IF;
        END IF;
    END LOOP;

    -- Retourner un résultat détaillé
    result_data := json_build_object(
        'success', true,
        'user_id', p_user_id,
        'formation_id', p_formation_id,
        'lessons_initialized', lessons_initialized,
        'exercises_initialized', exercises_initialized,
        'message', 'Initialization completed successfully'
    );

    RETURN result_data;
END;
$$;

-- Améliorer le trigger pour utiliser la nouvelle fonction et gérer les erreurs
CREATE OR REPLACE FUNCTION public.auto_initialize_lessons()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    init_result json;
BEGIN
    -- Quand une demande d'inscription est approuvée
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Appeler la fonction d'initialisation et capturer le résultat
        SELECT public.initialize_first_lessons_for_user(NEW.user_id, NEW.formation_id) INTO init_result;
        
        -- Log le résultat pour le débogage
        RAISE NOTICE 'Lesson initialization result: %', init_result;
        
        -- Si l'initialisation échoue, on peut choisir de continuer ou d'échouer
        -- Pour l'instant, on continue mais on log l'erreur
        IF NOT (init_result->>'success')::boolean THEN
            RAISE WARNING 'Failed to initialize lessons for user % in formation %: %', 
                NEW.user_id, NEW.formation_id, init_result->>'error';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- S'assurer que le trigger existe
DROP TRIGGER IF EXISTS trigger_auto_initialize_lessons ON public.enrollment_requests;
CREATE TRIGGER trigger_auto_initialize_lessons
    AFTER UPDATE ON public.enrollment_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_initialize_lessons();
