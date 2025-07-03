
-- Créer les policies pour le bucket exercise_files
CREATE POLICY "Admins can insert exercise files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'exercise_files' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update exercise files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'exercise_files' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete exercise files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'exercise_files' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can view exercise files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'exercise_files' AND
  auth.role() = 'authenticated'
);
