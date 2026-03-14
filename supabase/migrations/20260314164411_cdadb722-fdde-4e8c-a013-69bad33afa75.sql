
-- Table des offres d'emploi pour les boutiques
CREATE TABLE public.shop_job_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.physical_shops(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  keywords TEXT[] DEFAULT '{}',
  location TEXT,
  experience_level TEXT DEFAULT 'any',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shop_job_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners can manage their job listings"
  ON public.shop_job_listings FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Anyone can view active job listings"
  ON public.shop_job_listings FOR SELECT TO authenticated
  USING (is_active = true);

-- Table des invitations CV
CREATE TABLE public.cv_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_id UUID NOT NULL REFERENCES public.public_cvs(id) ON DELETE CASCADE,
  cv_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES public.physical_shops(id) ON DELETE SET NULL,
  job_listing_id UUID REFERENCES public.shop_job_listings(id) ON DELETE SET NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cv_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inviters can manage their invitations"
  ON public.cv_invitations FOR ALL TO authenticated
  USING (inviter_id = auth.uid())
  WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "CV owners can view their invitations"
  ON public.cv_invitations FOR SELECT TO authenticated
  USING (cv_owner_id = auth.uid());

CREATE POLICY "CV owners can update invitation status"
  ON public.cv_invitations FOR UPDATE TO authenticated
  USING (cv_owner_id = auth.uid())
  WITH CHECK (cv_owner_id = auth.uid());

-- Fonction de recherche dans les CV publics
CREATE OR REPLACE FUNCTION public.search_public_cvs(
  search_query TEXT DEFAULT NULL,
  search_location TEXT DEFAULT NULL,
  search_experience TEXT DEFAULT NULL,
  search_education TEXT DEFAULT NULL
)
RETURNS SETOF public.public_cvs
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT cv.*
  FROM public.public_cvs cv
  WHERE cv.is_public = true
    AND (
      search_query IS NULL
      OR cv.title ILIKE '%' || search_query || '%'
      OR cv.skills::text ILIKE '%' || search_query || '%'
      OR cv.personal_info::text ILIKE '%' || search_query || '%'
    )
    AND (
      search_location IS NULL
      OR cv.personal_info->>'address' ILIKE '%' || search_location || '%'
    )
    AND (
      search_experience IS NULL
      OR cv.experiences::text ILIKE '%' || search_experience || '%'
    )
    AND (
      search_education IS NULL
      OR cv.education::text ILIKE '%' || search_education || '%'
    )
  ORDER BY cv.updated_at DESC;
END;
$$;
