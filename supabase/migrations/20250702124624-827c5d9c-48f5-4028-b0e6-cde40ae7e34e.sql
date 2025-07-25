
-- Créer le nouveau bucket pour les fichiers d'exercices des leçons (ajoutés par les admins)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lessons_exercises_files', 'lessons_exercises_files', true);

-- Renommer le bucket existant exercise_files en students_exercises_submission_files
UPDATE storage.buckets 
SET id = 'students_exercises_submission_files', 
    name = 'students_exercises_submission_files'
WHERE id = 'exercise_files';

-- Mettre à jour les références dans les objets du storage
UPDATE storage.objects 
SET bucket_id = 'students_exercises_submission_files'
WHERE bucket_id = 'exercise_files';

-- Créer les policies pour le nouveau bucket lessons_exercises_files
CREATE POLICY "Admins can insert lessons exercise files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'lessons_exercises_files' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update lessons exercise files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'lessons_exercises_files' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete lessons exercise files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'lessons_exercises_files' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can view lessons exercise files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'lessons_exercises_files' AND
  auth.role() = 'authenticated'
);

-- Mettre à jour les policies pour le bucket renommé students_exercises_submission_files
DROP POLICY IF EXISTS "Admins can insert exercise files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update exercise files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete exercise files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view exercise files" ON storage.objects;

CREATE POLICY "Students can insert submission files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'students_exercises_submission_files' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Students can update their submission files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'students_exercises_submission_files' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Admins and teachers can delete submission files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'students_exercises_submission_files' AND
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_teacher = true
  ))
);

CREATE POLICY "Users can view submission files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'students_exercises_submission_files' AND
  auth.role() = 'authenticated'
);
