-- Créer le bucket de stockage pour les fichiers de supports de matières
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'subject_files',
  'subject_files',
  true,
  52428800, -- 50MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
);

-- Créer la table pour les fichiers de supports liés aux matières
CREATE TABLE public.subject_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX idx_subject_files_subject_id ON public.subject_files(subject_id);
CREATE INDEX idx_subject_files_uploaded_by ON public.subject_files(uploaded_by);

-- Activer RLS
ALTER TABLE public.subject_files ENABLE ROW LEVEL SECURITY;

-- Fonction helper pour vérifier si l'utilisateur est propriétaire d'une école ou professeur
CREATE OR REPLACE FUNCTION public.is_school_owner_or_teacher(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN user_role IN ('school_owner', 'teacher', 'admin');
END;
$$;

-- Politique RLS pour subject_files: lecture pour tous les authentifiés
CREATE POLICY "Authenticated users can view subject files"
ON public.subject_files
FOR SELECT
TO authenticated
USING (true);

-- Politique RLS pour subject_files: insertion pour propriétaires et profs
CREATE POLICY "School owners and teachers can upload subject files"
ON public.subject_files
FOR INSERT
TO authenticated
WITH CHECK (public.is_school_owner_or_teacher(auth.uid()));

-- Politique RLS pour subject_files: modification pour propriétaires et profs
CREATE POLICY "School owners and teachers can update subject files"
ON public.subject_files
FOR UPDATE
TO authenticated
USING (public.is_school_owner_or_teacher(auth.uid()));

-- Politique RLS pour subject_files: suppression pour propriétaires et profs
CREATE POLICY "School owners and teachers can delete subject files"
ON public.subject_files
FOR DELETE
TO authenticated
USING (public.is_school_owner_or_teacher(auth.uid()));

-- Politiques RLS pour le bucket storage
CREATE POLICY "Authenticated users can view subject files in storage"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'subject_files');

CREATE POLICY "School owners and teachers can upload to subject_files bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'subject_files' AND
  public.is_school_owner_or_teacher(auth.uid())
);

CREATE POLICY "School owners and teachers can update subject_files in storage"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'subject_files' AND
  public.is_school_owner_or_teacher(auth.uid())
);

CREATE POLICY "School owners and teachers can delete from subject_files bucket"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'subject_files' AND
  public.is_school_owner_or_teacher(auth.uid())
);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_subject_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subject_files_updated_at
BEFORE UPDATE ON public.subject_files
FOR EACH ROW
EXECUTE FUNCTION public.update_subject_files_updated_at();