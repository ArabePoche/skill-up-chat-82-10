-- Fix approve_school_join_request to properly update status and return success
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
  v_teacher_data RECORD;
  v_form_data JSONB;
  v_teacher_type TEXT;
  v_specialties TEXT[];
  v_preferred_grade TEXT;
  v_class_id UUID;
  v_teacher_id UUID;
BEGIN
  -- 1. Récupérer la demande avec vérification du propriétaire
  SELECT sjr.*, s.owner_id, s.id as school_id
  INTO v_request
  FROM school_join_requests sjr
  JOIN schools s ON s.id = sjr.school_id
  WHERE sjr.id = p_request_id AND sjr.status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or already processed');
  END IF;

  IF v_request.owner_id != p_reviewer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: only school owner can approve');
  END IF;

  -- 2. Mettre à jour le statut AVANT tout le reste
  UPDATE school_join_requests
  SET 
    status = 'approved',
    reviewed_by = p_reviewer_id,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;

  -- 3. Si c'est un professeur, l'ajouter à school_teachers
  IF v_request.role = 'teacher' THEN
    v_form_data := COALESCE(v_request.form_data, '{}'::jsonb);
    v_teacher_type := COALESCE(v_form_data->>'teacherType', 'generalist');
    v_preferred_grade := v_form_data->>'preferredGrade';
    
    IF v_form_data->>'specialty' IS NOT NULL THEN
      v_specialties := ARRAY[v_form_data->>'specialty'];
    ELSE
      v_specialties := NULL;
    END IF;

    SELECT first_name, last_name, email, phone
    INTO v_teacher_data
    FROM profiles
    WHERE id = v_request.user_id;

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

    -- 4. Assignation automatique si généraliste avec classe préférée
    IF v_teacher_type = 'generalist' AND v_preferred_grade IS NOT NULL THEN
      SELECT id INTO v_class_id
      FROM classes
      WHERE school_id = v_request.school_id AND name = v_preferred_grade
      LIMIT 1;

      SELECT id INTO v_teacher_id
      FROM school_teachers
      WHERE school_id = v_request.school_id AND user_id = v_request.user_id
      LIMIT 1;

      IF v_class_id IS NOT NULL AND v_teacher_id IS NOT NULL THEN
        INSERT INTO school_teacher_classes (teacher_id, class_id, subject)
        VALUES (v_teacher_id, v_class_id, 'Généraliste')
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Request approved successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;