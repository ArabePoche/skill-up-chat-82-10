-- ======================================================================
-- FONCTION D'APPROBATION AMÉLIORÉE DES DEMANDES D'ADHÉSION
-- Automatise : attribution du rôle, création school_teachers, assignation classe
-- ======================================================================

CREATE OR REPLACE FUNCTION approve_school_join_request(
  p_request_id UUID,
  p_reviewer_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_role_id UUID;
  v_teacher_id UUID;
  v_class_id UUID;
  v_form_data jsonb;
  v_teacher_type TEXT;
  v_class_name TEXT;
BEGIN
  -- Récupérer la demande
  SELECT * INTO v_request 
  FROM school_join_requests 
  WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request not found'
    );
  END IF;

  -- Vérifier que la demande est en attente
  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request already processed'
    );
  END IF;

  v_form_data := v_request.form_data;

  -- 1. Mettre à jour le statut de la demande
  UPDATE school_join_requests
  SET 
    status = 'approved',
    reviewed_by = p_reviewer_id,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  -- 2. Attribuer le rôle dans school_user_roles
  -- Récupérer l'ID du rôle selon le type de demande
  IF v_form_data ? 'roleId' THEN
    -- Si le roleId est fourni dans form_data (ex: superviseur)
    v_role_id := (v_form_data->>'roleId')::UUID;
  ELSE
    -- Sinon, chercher le rôle système correspondant
    SELECT id INTO v_role_id
    FROM school_roles
    WHERE name = v_request.role
      AND is_system = true
      AND school_id IS NULL
    LIMIT 1;
  END IF;

  -- Créer l'entrée dans school_user_roles si elle n'existe pas déjà
  IF v_role_id IS NOT NULL THEN
    INSERT INTO school_user_roles (user_id, school_id, role_id, assigned_by)
    VALUES (v_request.user_id, v_request.school_id, v_role_id, p_reviewer_id)
    ON CONFLICT (user_id, school_id, role_id) DO NOTHING;
  END IF;

  -- 3. Traitement spécifique pour les enseignants
  IF v_request.role = 'teacher' THEN
    v_teacher_type := v_form_data->>'teacherType';
    
    -- Récupérer le nom de classe depuis form_data
    v_class_name := COALESCE(
      v_form_data->>'className',
      v_form_data->>'preferredGrade',
      v_form_data->>'class'
    );

    -- Récupérer les informations du profil utilisateur
    DECLARE
      v_user_profile RECORD;
    BEGIN
      SELECT first_name, last_name, email
      INTO v_user_profile
      FROM profiles
      WHERE id = v_request.user_id;

      -- Créer l'entrée dans school_teachers si elle n'existe pas
      INSERT INTO school_teachers (
        school_id,
        user_id,
        first_name,
        last_name,
        email,
        teacher_type,
        specialties,
        employment_status,
        application_status
      )
      VALUES (
        v_request.school_id,
        v_request.user_id,
        v_user_profile.first_name,
        v_user_profile.last_name,
        v_user_profile.email,
        COALESCE(v_teacher_type, 'specialist'),
        CASE 
          WHEN v_form_data ? 'specialty' THEN ARRAY[v_form_data->>'specialty']
          WHEN v_form_data ? 'specialties' THEN 
            ARRAY(SELECT jsonb_array_elements_text(v_form_data->'specialties'))
          ELSE ARRAY[]::TEXT[]
        END,
        'active',
        'approved'
      )
      ON CONFLICT (school_id, user_id) 
      DO UPDATE SET
        teacher_type = EXCLUDED.teacher_type,
        employment_status = 'active',
        application_status = 'approved',
        updated_at = now()
      RETURNING id INTO v_teacher_id;

    EXCEPTION WHEN OTHERS THEN
      -- Si erreur lors de la création du teacher, continuer quand même
      NULL;
    END;

    -- 4. Assignation automatique à la classe pour les généralistes
    IF v_teacher_type = 'generalist' AND v_class_name IS NOT NULL AND v_teacher_id IS NOT NULL THEN
      -- Chercher la classe par son nom
      SELECT id INTO v_class_id
      FROM classes
      WHERE school_id = v_request.school_id
        AND name ILIKE v_class_name
      LIMIT 1;

      -- Si la classe existe, créer l'assignation
      IF v_class_id IS NOT NULL THEN
        INSERT INTO school_teacher_classes (teacher_id, class_id)
        VALUES (v_teacher_id, v_class_id)
        ON CONFLICT (teacher_id, class_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  -- Retourner le succès
  RETURN jsonb_build_object(
    'success', true,
    'teacher_id', v_teacher_id,
    'role_id', v_role_id,
    'class_assigned', v_class_id IS NOT NULL
  );

EXCEPTION WHEN OTHERS THEN
  -- En cas d'erreur, rollback automatique et retour de l'erreur
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;