CREATE TABLE IF NOT EXISTS public.formation_pre_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id UUID NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  motivation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ,
  UNIQUE (formation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_formation_pre_registrations_formation_id
  ON public.formation_pre_registrations(formation_id);

CREATE INDEX IF NOT EXISTS idx_formation_pre_registrations_user_id
  ON public.formation_pre_registrations(user_id);

ALTER TABLE public.formation_pre_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own formation pre-registrations" ON public.formation_pre_registrations;
CREATE POLICY "Users can view their own formation pre-registrations"
ON public.formation_pre_registrations
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own formation pre-registrations" ON public.formation_pre_registrations;
CREATE POLICY "Users can create their own formation pre-registrations"
ON public.formation_pre_registrations
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Authors can view formation pre-registrations" ON public.formation_pre_registrations;
CREATE POLICY "Authors can view formation pre-registrations"
ON public.formation_pre_registrations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.formations f
    WHERE f.id = formation_pre_registrations.formation_id
      AND f.author_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can view all formation pre-registrations" ON public.formation_pre_registrations;
CREATE POLICY "Admins can view all formation pre-registrations"
ON public.formation_pre_registrations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Authors can update formation pre-registrations" ON public.formation_pre_registrations;
CREATE POLICY "Authors can update formation pre-registrations"
ON public.formation_pre_registrations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.formations f
    WHERE f.id = formation_pre_registrations.formation_id
      AND f.author_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.formations f
    WHERE f.id = formation_pre_registrations.formation_id
      AND f.author_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can update formation pre-registrations" ON public.formation_pre_registrations;
CREATE POLICY "Admins can update formation pre-registrations"
ON public.formation_pre_registrations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Anyone can view active formations" ON public.formations;
DROP POLICY IF EXISTS "Anyone can view published formations" ON public.formations;
CREATE POLICY "Anyone can view published formations"
ON public.formations
FOR SELECT
USING (is_active = true OR approval_status = 'approved');

CREATE OR REPLACE FUNCTION public.get_formation_pre_registrations(p_formation_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  motivation TEXT,
  created_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  email TEXT,
  phone TEXT,
  country TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.formations f
    WHERE f.id = p_formation_id
      AND (
        f.author_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
      )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    pr.id,
    pr.user_id,
    pr.motivation,
    pr.created_at,
    pr.notified_at,
    p.first_name,
    p.last_name,
    p.username,
    p.email,
    p.phone,
    p.country,
    p.avatar_url
  FROM public.formation_pre_registrations pr
  JOIN public.profiles p ON p.id = pr.user_id
  WHERE pr.formation_id = p_formation_id
  ORDER BY pr.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_formation_pre_registrations(UUID) TO authenticated;
