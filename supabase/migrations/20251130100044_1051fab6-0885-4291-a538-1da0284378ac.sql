-- Table pour exclure des permissions héritées du rôle pour un utilisateur spécifique
CREATE TABLE IF NOT EXISTS public.school_user_permission_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES public.school_permissions(code) ON DELETE CASCADE,
  excluded_by UUID REFERENCES auth.users(id),
  excluded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, user_id, permission_code)
);

-- Activer RLS
ALTER TABLE public.school_user_permission_exclusions ENABLE ROW LEVEL SECURITY;

-- Politique: les membres de l'école peuvent voir les exclusions
CREATE POLICY "Members can view permission exclusions"
  ON public.school_user_permission_exclusions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.school_user_roles sur
      WHERE sur.school_id = school_user_permission_exclusions.school_id
      AND sur.user_id = auth.uid()
    )
  );

-- Politique: les admins peuvent gérer les exclusions
CREATE POLICY "Admins can manage permission exclusions"
  ON public.school_user_permission_exclusions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.school_user_roles sur
      JOIN public.school_roles sr ON sur.role_id = sr.id
      WHERE sur.school_id = school_user_permission_exclusions.school_id
      AND sur.user_id = auth.uid()
      AND sr.name IN ('owner', 'admin')
    )
  );

-- Mettre à jour la fonction get_user_school_permissions pour prendre en compte les exclusions
CREATE OR REPLACE FUNCTION get_user_school_permissions(_user_id uuid, _school_id uuid)
RETURNS TABLE (permission_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Permissions héritées des rôles (système + école spécifique) MOINS les exclusions
  SELECT DISTINCT srp.permission_code
  FROM school_user_roles sur
  JOIN school_role_permissions srp ON sur.role_id = srp.role_id 
    AND (srp.school_id = _school_id OR srp.school_id IS NULL)
  WHERE sur.user_id = _user_id 
    AND sur.school_id = _school_id 
    AND srp.enabled = true
    -- Exclure les permissions désactivées pour cet utilisateur
    AND NOT EXISTS (
      SELECT 1 FROM school_user_permission_exclusions supe
      WHERE supe.user_id = _user_id
      AND supe.school_id = _school_id
      AND supe.permission_code = srp.permission_code
    )
  
  UNION
  
  -- Permissions supplémentaires accordées directement à l'utilisateur
  SELECT suep.permission_code
  FROM school_user_extra_permissions suep
  WHERE suep.user_id = _user_id 
    AND suep.school_id = _school_id;
$$;