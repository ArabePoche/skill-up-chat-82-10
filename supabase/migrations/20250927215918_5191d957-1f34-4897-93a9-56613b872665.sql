-- Rendre le bucket public pour permettre l'accès via URL publique
UPDATE storage.buckets 
SET public = true
WHERE id = 'teacher_application_files';

-- Autoriser la lecture publique des objets du bucket (nécessaire pour /object/public/...)
CREATE POLICY "Public read teacher application files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'teacher_application_files'
);