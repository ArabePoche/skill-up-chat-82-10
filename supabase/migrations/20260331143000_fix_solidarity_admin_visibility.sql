-- Garantir la visibilité des cagnottes en attente pour les administrateurs
DROP POLICY IF EXISTS "Anyone can view approved campaigns" ON public.solidarity_campaigns;
DROP POLICY IF EXISTS "Anyone can view approved or own campaigns" ON public.solidarity_campaigns;
DROP POLICY IF EXISTS "Authenticated can view approved or own campaigns" ON public.solidarity_campaigns;

CREATE POLICY "Authenticated can view approved or own campaigns"
ON public.solidarity_campaigns
FOR SELECT
TO authenticated
USING (
  status IN ('approved', 'completed')
  OR creator_id = auth.uid()
  OR public.is_admin(auth.uid())
);
