-- Créer le bucket de stockage pour les photos des élèves
INSERT INTO storage.buckets (id, name, public) 
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Créer les politiques de stockage pour les photos des élèves
CREATE POLICY "Propriétaires d'école peuvent uploader des photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-photos' AND
  EXISTS (
    SELECT 1 FROM schools
    WHERE schools.owner_id = auth.uid()
    AND (storage.foldername(name))[1] = schools.id::text
  )
);

CREATE POLICY "Propriétaires d'école peuvent modifier leurs photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'student-photos' AND
  EXISTS (
    SELECT 1 FROM schools
    WHERE schools.owner_id = auth.uid()
    AND (storage.foldername(name))[1] = schools.id::text
  )
);

CREATE POLICY "Propriétaires d'école peuvent supprimer leurs photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'student-photos' AND
  EXISTS (
    SELECT 1 FROM schools
    WHERE schools.owner_id = auth.uid()
    AND (storage.foldername(name))[1] = schools.id::text
  )
);

CREATE POLICY "Photos des élèves sont publiques"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'student-photos');