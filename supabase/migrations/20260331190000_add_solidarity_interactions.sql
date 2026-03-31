-- Interactions sociales autour des cagnottes solidaires
ALTER TABLE public.solidarity_campaigns
ADD COLUMN IF NOT EXISTS contributor_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.solidarity_campaign_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.solidarity_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.solidarity_campaign_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.solidarity_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'native',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.solidarity_campaign_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.solidarity_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_solidarity_campaign_likes_campaign_id
  ON public.solidarity_campaign_likes(campaign_id);

CREATE INDEX IF NOT EXISTS idx_solidarity_campaign_shares_campaign_id
  ON public.solidarity_campaign_shares(campaign_id);

CREATE INDEX IF NOT EXISTS idx_solidarity_campaign_testimonials_campaign_id
  ON public.solidarity_campaign_testimonials(campaign_id);

ALTER TABLE public.solidarity_campaign_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solidarity_campaign_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solidarity_campaign_testimonials ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_solidarity_campaign(
  p_campaign_id UUID,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.solidarity_campaigns AS campaign
    WHERE campaign.id = p_campaign_id
      AND (
        campaign.status IN ('approved', 'completed')
        OR campaign.creator_id = p_user_id
        OR public.is_admin(p_user_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_solidarity_contributors(
  p_campaign_id UUID,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    p_user_id IS NOT NULL AND (
      public.is_admin(p_user_id)
      OR EXISTS (
        SELECT 1
        FROM public.solidarity_campaigns AS campaign
        WHERE campaign.id = p_campaign_id
          AND campaign.creator_id = p_user_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.solidarity_contributions AS contribution
        WHERE contribution.campaign_id = p_campaign_id
          AND contribution.contributor_id = p_user_id
      )
    ),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_solidarity_campaign(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_solidarity_contributors(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Anyone can view contributions" ON public.solidarity_contributions;

CREATE POLICY "Contributors can view campaign contributions"
ON public.solidarity_contributions
FOR SELECT
TO authenticated
USING (public.can_view_solidarity_contributors(campaign_id, auth.uid()));

CREATE POLICY "Users can read solidarity likes"
ON public.solidarity_campaign_likes
FOR SELECT
TO authenticated
USING (public.can_access_solidarity_campaign(campaign_id, auth.uid()));

CREATE POLICY "Users can like visible solidarity campaigns"
ON public.solidarity_campaign_likes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.can_access_solidarity_campaign(campaign_id, auth.uid())
);

CREATE POLICY "Users can unlike own solidarity likes"
ON public.solidarity_campaign_likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can read solidarity shares"
ON public.solidarity_campaign_shares
FOR SELECT
TO authenticated
USING (public.can_access_solidarity_campaign(campaign_id, auth.uid()));

CREATE POLICY "Users can record solidarity shares"
ON public.solidarity_campaign_shares
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.can_access_solidarity_campaign(campaign_id, auth.uid())
);

CREATE POLICY "Users can read solidarity testimonials"
ON public.solidarity_campaign_testimonials
FOR SELECT
TO authenticated
USING (public.can_access_solidarity_campaign(campaign_id, auth.uid()));

CREATE POLICY "Users can add solidarity testimonials"
ON public.solidarity_campaign_testimonials
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND length(trim(content)) > 0
  AND public.can_access_solidarity_campaign(campaign_id, auth.uid())
);

CREATE POLICY "Users can update own solidarity testimonials"
ON public.solidarity_campaign_testimonials
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND length(trim(content)) > 0);

CREATE POLICY "Users can delete own solidarity testimonials"
ON public.solidarity_campaign_testimonials
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

UPDATE public.solidarity_campaigns AS campaign
SET contributor_count = COALESCE(stats.contributor_count, 0)
FROM (
  SELECT campaign_id, COUNT(DISTINCT contributor_id)::INTEGER AS contributor_count
  FROM public.solidarity_contributions
  GROUP BY campaign_id
) AS stats
WHERE stats.campaign_id = campaign.id;

UPDATE public.solidarity_campaigns
SET contributor_count = 0
WHERE contributor_count IS NULL;

NOTIFY pgrst, 'reload schema';