
-- Fix 1 : Permettre aux admins de voir toutes les cagnottes (y compris en attente)
DROP POLICY IF EXISTS "Anyone can view approved campaigns" ON public.solidarity_campaigns;

CREATE POLICY "Anyone can view approved or own campaigns" ON public.solidarity_campaigns
  FOR SELECT USING (
    status IN ('approved', 'completed')
    OR creator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Fix 2 : Créer le bucket Supabase pour les images de cagnottes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'solidarity-images',
  'solidarity-images',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Politique : tout utilisateur authentifié peut uploader dans son propre dossier
CREATE POLICY "Auth users can upload solidarity images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'solidarity-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Politique : lecture publique des images
CREATE POLICY "Public can view solidarity images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'solidarity-images');

-- Politique : le propriétaire peut supprimer ses images
CREATE POLICY "Owner can delete solidarity images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'solidarity-images' AND (storage.foldername(name))[1] = auth.uid()::text);
