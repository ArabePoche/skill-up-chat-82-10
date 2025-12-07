-- Corriger la fonction is_school_member pour utiliser school_staff au lieu de school_members
CREATE OR REPLACE FUNCTION public.is_school_member(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.school_staff ss
    WHERE ss.user_id = _user_id
      AND ss.school_id = _school_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.schools s
    WHERE s.id = _school_id
      AND s.owner_id = _user_id
  );
$$;