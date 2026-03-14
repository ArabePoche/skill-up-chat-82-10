-- Permettre au propriétaire de voir TOUTES ses annonces (pas seulement les actives)
DROP POLICY IF EXISTS "Active ads are visible to all authenticated" ON public.recruitment_ads;
DROP POLICY IF EXISTS "Owners can manage their ads" ON public.recruitment_ads;

-- Policy: propriétaire peut tout faire sur ses annonces
CREATE POLICY "Owners can manage their ads"
ON public.recruitment_ads
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Policy: tout le monde peut voir les annonces actives
CREATE POLICY "Active ads visible to all"
ON public.recruitment_ads
FOR SELECT
TO authenticated
USING (is_active = true AND status = 'active');