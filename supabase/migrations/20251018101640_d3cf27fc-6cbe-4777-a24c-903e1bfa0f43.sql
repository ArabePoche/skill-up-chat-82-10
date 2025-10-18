-- Ajouter les colonnes pour les messages audio et fichiers de rejet d'exercice
ALTER TABLE lesson_messages
ADD COLUMN IF NOT EXISTS reject_audio_url TEXT,
ADD COLUMN IF NOT EXISTS reject_audio_duration INTEGER,
ADD COLUMN IF NOT EXISTS reject_files_urls TEXT[];

-- Créer un bucket pour les fichiers de rejet d'exercices
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise_rejection_files', 'exercise_rejection_files', true)
ON CONFLICT (id) DO NOTHING;

-- Policy pour permettre aux professeurs d'uploader des fichiers de rejet
CREATE POLICY "Teachers can upload rejection files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'exercise_rejection_files' AND
  EXISTS (
    SELECT 1 FROM teachers t
    WHERE t.user_id = auth.uid()
  )
);

-- Policy pour voir les fichiers de rejet
CREATE POLICY "Users can view rejection files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'exercise_rejection_files');

-- Policy pour supprimer les fichiers de rejet (seulement le professeur qui l'a uploadé)
CREATE POLICY "Teachers can delete their rejection files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'exercise_rejection_files' AND
  EXISTS (
    SELECT 1 FROM teachers t
    WHERE t.user_id = auth.uid()
  )
);