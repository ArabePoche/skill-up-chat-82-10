-- Corriger la fonction approve_school_join_request pour gérer les emails NULL
CREATE OR REPLACE FUNCTION public.approve_school_join_request(p_request_id UUID, p_reviewer_id UUID)
RETURNS JSONB
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
  v_class_id UUID;
  v_subject_id UUID;
  v_role_id UUID;
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

  -- Extraire les données du profil et l'email de auth.users comme fallback
  SELECT 
    COALESCE(p.first_name, 'N/A'),
    COALESCE(p.last_name, 'N/A'),
    COALESCE(p.email, u.email, 'N/A')
  INTO v_first_name, v_last_name, v_email
  FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.id = v_user_id;

  -- Récupérer le role_id correspondant au rôle demandé
  SELECT id INTO v_role_id
  FROM school_roles
  WHERE name = v_request.role AND (school_id = v_school_id OR is_system = true)
  LIMIT 1;

  -- Mapper teacher_type
  v_teacher_type := CASE 
    WHEN v_form_data->>'teacherType' = 'generalist' THEN 'generaliste'
    WHEN v_form_data->>'teacherType' = 'specialist' THEN 'specialiste'
    ELSE v_form_data->>'teacherType'
  END;

  -- Extraire class_id et subject_id du form_data
  IF v_form_data ? 'classId' AND v_form_data->>'classId' IS NOT NULL AND v_form_data->>'classId' != '' THEN
    v_class_id := (v_form_data->>'classId')::UUID;
  END IF;
  
  IF v_form_data ? 'subjectId' AND v_form_data->>'subjectId' IS NOT NULL AND v_form_data->>'subjectId' != '' THEN
    v_subject_id := (v_form_data->>'subjectId')::UUID;
  END IF;

  -- Extraire specialties
  IF v_form_data ? 'specialty' THEN
    v_specialties := ARRAY[v_form_data->>'specialty'];
  ELSIF v_form_data ? 'customSpecialty' AND v_form_data->>'customSpecialty' IS NOT NULL THEN
    v_specialties := ARRAY[v_form_data->>'customSpecialty'];
  END IF;

  BEGIN
    -- Mettre à jour le statut de la demande
    UPDATE school_join_requests
    SET 
      status = 'approved',
      reviewed_at = NOW(),
      reviewed_by = p_reviewer_id
    WHERE id = p_request_id;

    -- Ajouter le membre à school_staff
    INSERT INTO school_staff (
      school_id,
      user_id,
      first_name,
      last_name,
      email,
      position,
      status
    ) VALUES (
      v_school_id,
      v_user_id,
      v_first_name,
      v_last_name,
      v_email,
      v_request.role,
      'active'
    )
    ON CONFLICT (school_id, user_id) DO UPDATE SET
      position = EXCLUDED.position,
      status = 'active',
      updated_at = NOW();

    -- Ajouter le rôle à l'utilisateur
    IF v_role_id IS NOT NULL THEN
      INSERT INTO school_user_roles (school_id, user_id, role_id)
      VALUES (v_school_id, v_user_id, v_role_id)
      ON CONFLICT (school_id, user_id, role_id) DO NOTHING;
    END IF;

    -- Si c'est un enseignant, l'ajouter à school_teachers
    IF v_request.role = 'teacher' THEN
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
      )
      ON CONFLICT (school_id, user_id) DO UPDATE SET
        teacher_type = EXCLUDED.teacher_type,
        specialties = EXCLUDED.specialties,
        application_status = 'approved',
        employment_status = 'active';

      -- Si c'est un généraliste avec une classe sélectionnée, assigner aux matières de la classe
      IF v_teacher_type = 'generaliste' AND v_class_id IS NOT NULL THEN
        UPDATE class_subjects
        SET teacher_id = v_user_id
        WHERE class_id = v_class_id AND teacher_id IS NULL;
      END IF;
    END IF;

    RETURN jsonb_build_object('success', true);
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$;