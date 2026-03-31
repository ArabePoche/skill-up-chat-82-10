-- Fix définitif : les admins peuvent voir toutes les cagnottes (y compris "pending")
-- Ce fichier remplace le correctif précédent (20260331_solidarity_admin_fixes.sql)
-- dont le nom non-standard pouvait être ignoré par Supabase.

DROP POLICY IF EXISTS "Anyone can view approved campaigns" ON public.solidarity_campaigns;
DROP POLICY IF EXISTS "Anyone can view approved or own campaigns" ON public.solidarity_campaigns;

CREATE POLICY "Anyone can view approved or own campaigns" ON public.solidarity_campaigns
  FOR SELECT USING (
    status IN ('approved', 'completed')
    OR creator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
