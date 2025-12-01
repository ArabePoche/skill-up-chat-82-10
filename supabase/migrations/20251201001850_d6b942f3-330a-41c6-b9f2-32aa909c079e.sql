-- Assign evaluation permissions to roles (teacher, admin, secretary)
DO $$
DECLARE
  v_role_id uuid;
  v_permission_code text;
BEGIN
  -- For each role (using name and is_system filter)
  FOR v_role_id IN 
    SELECT id FROM school_roles 
    WHERE name IN ('Enseignant', 'Administrateur', 'Secrétaire') 
    AND is_system = true
  LOOP
    -- For each evaluation permission
    FOR v_permission_code IN 
      SELECT unnest(ARRAY['evaluation.view', 'evaluation.create', 'evaluation.update', 'evaluation.delete'])
    LOOP
      -- Check if the assignment already exists
      IF NOT EXISTS (
        SELECT 1 FROM school_role_permissions 
        WHERE role_id = v_role_id AND permission_code = v_permission_code
      ) THEN
        -- Insert the permission assignment
        INSERT INTO school_role_permissions (role_id, permission_code)
        VALUES (v_role_id, v_permission_code);
      END IF;
    END LOOP;
  END LOOP;
END $$;