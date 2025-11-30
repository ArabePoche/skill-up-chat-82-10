-- Correction de la fonction get_user_school_permissions pour inclure les permissions système (school_id IS NULL)
CREATE OR REPLACE FUNCTION get_user_school_permissions(_user_id uuid, _school_id uuid)
RETURNS TABLE (permission_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Permissions héritées des rôles (système + école spécifique)
  SELECT DISTINCT srp.permission_code
  FROM school_user_roles sur
  JOIN school_role_permissions srp ON sur.role_id = srp.role_id 
    AND (srp.school_id = _school_id OR srp.school_id IS NULL)  -- CORRECTION: inclure les permissions système
  WHERE sur.user_id = _user_id 
    AND sur.school_id = _school_id 
    AND srp.enabled = true
  
  UNION
  
  -- Permissions supplémentaires accordées directement à l'utilisateur
  SELECT suep.permission_code
  FROM school_user_extra_permissions suep
  WHERE suep.user_id = _user_id 
    AND suep.school_id = _school_id;
$$;