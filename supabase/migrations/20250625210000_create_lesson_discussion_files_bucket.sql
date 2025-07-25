
-- Créer le bucket pour les fichiers des discussions de leçons
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lesson_discussion_files', 'lesson_discussion_files', true);

-- Politique pour permettre aux utilisateurs authentifiés d'uploader des fichiers
CREATE POLICY "Users can upload lesson discussion files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'lesson_discussion_files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Politique pour permettre la lecture publique des fichiers
CREATE POLICY "Public can view lesson discussion files" ON storage.objects
FOR SELECT USING (bucket_id = 'lesson_discussion_files');

-- Politique pour permettre aux utilisateurs de supprimer leurs propres fichiers
CREATE POLICY "Users can delete their own lesson discussion files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'lesson_discussion_files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
