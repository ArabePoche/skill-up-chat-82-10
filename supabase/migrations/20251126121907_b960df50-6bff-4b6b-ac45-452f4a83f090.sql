-- Créer la table pour les fichiers de supports par matière/classe
CREATE TABLE IF NOT EXISTS public.class_subject_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_subject_id UUID NOT NULL REFERENCES public.class_subjects(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX idx_class_subject_files_class_subject_id ON public.class_subject_files(class_subject_id);

-- RLS
ALTER TABLE public.class_subject_files ENABLE ROW LEVEL SECURITY;

-- Politique de lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Utilisateurs authentifiés peuvent voir les fichiers"
  ON public.class_subject_files FOR SELECT
  USING (auth.role() = 'authenticated');

-- Politique d'insertion pour les utilisateurs authentifiés
CREATE POLICY "Utilisateurs authentifiés peuvent ajouter des fichiers"
  ON public.class_subject_files FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Politique de suppression pour les utilisateurs authentifiés
CREATE POLICY "Utilisateurs authentifiés peuvent supprimer des fichiers"
  ON public.class_subject_files FOR DELETE
  USING (auth.role() = 'authenticated');

-- Créer le bucket storage si nécessaire
INSERT INTO storage.buckets (id, name, public)
VALUES ('class_subject_files', 'class_subject_files', true)
ON CONFLICT (id) DO NOTHING;

-- Politique de storage pour lecture
CREATE POLICY "Public peut lire les fichiers de classe"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'class_subject_files');

-- Politique de storage pour upload
CREATE POLICY "Authentifiés peuvent uploader"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'class_subject_files' AND auth.role() = 'authenticated');

-- Politique de storage pour suppression
CREATE POLICY "Authentifiés peuvent supprimer"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'class_subject_files' AND auth.role() = 'authenticated');