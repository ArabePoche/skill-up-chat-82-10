
-- Ajouter la colonne cover au schools
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS site_cover_url TEXT;

-- Créer le bucket pour les fichiers du site scolaire (cover + galerie)
INSERT INTO storage.buckets (id, name, public)
VALUES ('school_site_files', 'school_site_files', true)
ON CONFLICT (id) DO NOTHING;

-- Politique de lecture publique
CREATE POLICY "School site files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'school_site_files');

-- Politique d'upload pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can upload school site files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'school_site_files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Politique de mise à jour
CREATE POLICY "Users can update their own school site files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'school_site_files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Politique de suppression
CREATE POLICY "Users can delete their own school site files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'school_site_files' AND auth.uid()::text = (storage.foldername(name))[1]);
