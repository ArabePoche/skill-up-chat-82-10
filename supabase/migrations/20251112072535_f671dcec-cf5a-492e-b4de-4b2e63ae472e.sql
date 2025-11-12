-- 1) Create security definer helper functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_school_member(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.school_members sm
    WHERE sm.user_id = _user_id
      AND sm.school_id = _school_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_school_owner(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.schools s
    WHERE s.id = _school_id
      AND s.owner_id = _user_id
  );
$$;

-- 2) Update policies on schools to use the helper, remove direct cross-table refs
DROP POLICY IF EXISTS "School members can view their schools" ON public.schools;
CREATE POLICY "School members can view their schools"
ON public.schools
FOR SELECT
TO authenticated
USING ( public.is_school_member(auth.uid(), id) );

-- Keep owner-based policies (already exist) but normalize roles to authenticated
DROP POLICY IF EXISTS "School owners can view their schools" ON public.schools;
CREATE POLICY "School owners can view their schools"
ON public.schools
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "School owners can update their schools" ON public.schools;
CREATE POLICY "School owners can update their schools"
ON public.schools
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "School owners can delete their schools" ON public.schools;
CREATE POLICY "School owners can delete their schools"
ON public.schools
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- Ensure INSERT policy still requires verified users (kept from previous step)
DROP POLICY IF EXISTS "Verified users can create schools" ON public.schools;
CREATE POLICY "Verified users can create schools"
ON public.schools
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_user_verified(auth.uid()) = true
  AND auth.uid() = owner_id
);

-- 3) Update policies on school_members to avoid referencing schools directly in policy
DROP POLICY IF EXISTS "School members can view other members" ON public.school_members;
CREATE POLICY "School members can view other members"
ON public.school_members
FOR SELECT
TO authenticated
USING ( public.is_school_member(auth.uid(), school_members.school_id) );

DROP POLICY IF EXISTS "School owners can manage members" ON public.school_members;
CREATE POLICY "School owners can manage members"
ON public.school_members
FOR ALL
TO authenticated
USING ( public.is_school_owner(auth.uid(), school_members.school_id) )
WITH CHECK ( public.is_school_owner(auth.uid(), school_members.school_id) );