-- Fonction sécurisée pour approuver une demande d'adhésion
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
  v_school_id UUID;
  v_teacher_data RECORD;
  v_form_data JSONB;
  v_teacher_type TEXT;
  v_specialties TEXT[];
  v_preferred_grade TEXT;
BEGIN
  -- 1. Récupérer la demande avec toutes les infos
  SELECT sjr.*, s.owner_id, s.id as school_id
  INTO v_request
  FROM school_join_requests sjr
  JOIN schools s ON s.id = sjr.school_id
  WHERE sjr.id = p_request_id;

  -- Vérifier que la demande existe
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  -- Vérifier que le reviewer est bien le propriétaire de l'école
  IF v_request.owner_id != p_reviewer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: only school owner can approve');
  END IF;

  -- 2. Mettre à jour le statut de la demande
  UPDATE school_join_requests
  SET 
    status = 'approved',
    reviewed_by = p_reviewer_id,
    reviewed_at = NOW()
  WHERE id = p_request_id;

  -- 3. Si c'est un professeur, l'ajouter à school_teachers
  IF v_request.role = 'teacher' THEN
    -- Extraire les données du formulaire
    v_form_data := COALESCE(v_request.form_data, '{}'::jsonb);
    v_teacher_type := COALESCE(v_form_data->>'teacherType', 'generalist');
    v_preferred_grade := v_form_data->>'preferredGrade';
    
    -- Construire le tableau de spécialités
    IF v_form_data->>'specialty' IS NOT NULL THEN
      v_specialties := ARRAY[v_form_data->>'specialty'];
    ELSE
      v_specialties := NULL;
    END IF;

    -- Récupérer les infos du profil utilisateur
    SELECT 
      first_name,
      last_name,
      email,
      phone
    INTO v_teacher_data
    FROM profiles
    WHERE id = v_request.user_id;

    -- Insérer/Mettre à jour dans school_teachers (UPSERT)
    INSERT INTO school_teachers (
      school_id,
      user_id,
      first_name,
      last_name,
      email,
      phone,
      teacher_type,
      specialties,
      employment_status,
      application_status,
      hire_date
    ) VALUES (
      v_request.school_id,
      v_request.user_id,
      COALESCE(v_teacher_data.first_name, ''),
      COALESCE(v_teacher_data.last_name, ''),
      COALESCE(v_teacher_data.email, ''),
      COALESCE(v_teacher_data.phone, ''),
      v_teacher_type,
      v_specialties,
      'active',
      'approved',
      CURRENT_DATE
    )
    ON CONFLICT (school_id, user_id) 
    DO UPDATE SET
      teacher_type = EXCLUDED.teacher_type,
      specialties = EXCLUDED.specialties,
      employment_status = 'active',
      application_status = 'approved',
      hire_date = EXCLUDED.hire_date,
      updated_at = NOW();

    -- 4. Si généraliste avec classe préférée, créer l'assignation
    IF v_teacher_type = 'generalist' AND v_preferred_grade IS NOT NULL THEN
      -- Trouver la classe et le teacher_id
      DECLARE
        v_class_id UUID;
        v_teacher_id UUID;
      BEGIN
        SELECT id INTO v_class_id
        FROM classes
        WHERE school_id = v_request.school_id
          AND name = v_preferred_grade
        LIMIT 1;

        SELECT id INTO v_teacher_id
        FROM school_teachers
        WHERE school_id = v_request.school_id
          AND user_id = v_request.user_id
        LIMIT 1;

        IF v_class_id IS NOT NULL AND v_teacher_id IS NOT NULL THEN
          INSERT INTO school_teacher_classes (
            teacher_id,
            class_id,
            subject
          ) VALUES (
            v_teacher_id,
            v_class_id,
            'Généraliste'
          )
          ON CONFLICT DO NOTHING;
        END IF;
      END;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Request approved successfully');
END;
$$;

-- Fonction sécurisée pour rejeter une demande d'adhésion
CREATE OR REPLACE FUNCTION reject_school_join_request(
  p_request_id UUID,
  p_reviewer_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- 1. Récupérer la demande avec l'info du owner
  SELECT sjr.*, s.owner_id
  INTO v_request
  FROM school_join_requests sjr
  JOIN schools s ON s.id = sjr.school_id
  WHERE sjr.id = p_request_id;

  -- Vérifier que la demande existe
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  -- Vérifier que le reviewer est bien le propriétaire de l'école
  IF v_request.owner_id != p_reviewer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: only school owner can reject');
  END IF;

  -- 2. Mettre à jour le statut de la demande
  UPDATE school_join_requests
  SET 
    status = 'rejected',
    reviewed_by = p_reviewer_id,
    reviewed_at = NOW(),
    rejection_reason = p_reason
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'message', 'Request rejected successfully');
END;
$$;