-- Corriger la fonction approve_school_join_request avec le bon nom de champ
DROP FUNCTION IF EXISTS approve_school_join_request(uuid, uuid);

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
  v_user_id UUID;
  v_school_id UUID;
  v_first_name TEXT;
  v_last_name TEXT;
  v_email TEXT;
  v_form_data JSONB;
  v_teacher_type TEXT;
  v_specialties TEXT[];
  v_preferred_grade TEXT;
  v_class_id UUID;
BEGIN
  -- Récupérer la demande
  SELECT * INTO v_request
  FROM school_join_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request already processed');
  END IF;

  -- Vérifier que le reviewer est propriétaire de l'école
  IF NOT EXISTS (
    SELECT 1 FROM schools WHERE id = v_request.school_id AND owner_id = p_reviewer_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  v_user_id := v_request.user_id;
  v_school_id := v_request.school_id;
  v_form_data := v_request.form_data;

  -- Extraire les données du profil
  SELECT first_name, last_name, email
  INTO v_first_name, v_last_name, v_email
  FROM profiles
  WHERE id = v_user_id;

  -- Mapper teacher_type: 'generalist' -> 'generaliste', 'specialist' -> 'specialiste'
  v_teacher_type := CASE 
    WHEN v_form_data->>'teacherType' = 'generalist' THEN 'generaliste'
    WHEN v_form_data->>'teacherType' = 'specialist' THEN 'specialiste'
    ELSE v_form_data->>'teacherType'
  END;

  -- Extraire specialty et preferredGrade
  IF v_form_data ? 'specialty' THEN
    v_specialties := ARRAY[v_form_data->>'specialty'];
  END IF;

  v_preferred_grade := v_form_data->>'preferredGrade';

  -- Commencer la transaction
  BEGIN
    -- Mettre à jour le statut de la demande
    UPDATE school_join_requests
    SET 
      status = 'approved',
      reviewed_at = NOW(),
      reviewed_by = p_reviewer_id
    WHERE id = p_request_id;

    -- Si c'est un enseignant, l'ajouter à school_teachers
    IF v_request.role = 'teacher' THEN
      -- Chercher une classe correspondante pour les généralistes
      IF v_teacher_type = 'generaliste' AND v_preferred_grade IS NOT NULL THEN
        SELECT id INTO v_class_id
        FROM classes
        WHERE school_id = v_school_id 
        AND name ILIKE '%' || v_preferred_grade || '%'
        LIMIT 1;
      END IF;

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
      ) VALUES (
        v_school_id,
        v_user_id,
        v_first_name,
        v_last_name,
        v_email,
        v_teacher_type,
        v_specialties,
        'active',
        'approved'
      );
    END IF;

    RETURN jsonb_build_object('success', true);
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$;