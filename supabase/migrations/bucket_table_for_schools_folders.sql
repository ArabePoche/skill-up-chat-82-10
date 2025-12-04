-- Créer le bucket pour les fichiers des dossiers School OS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school_os_folders',
  'school_os_folders',
  true,
  52428800, -- 50MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-rar-compressed',
    'audio/mpeg', 'audio/wav', 'audio/ogg'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Policies pour le bucket
CREATE POLICY "Users can upload folder files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'school_os_folders' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public can view folder files"
ON storage.objects FOR SELECT
USING (bucket_id = 'school_os_folders');

CREATE POLICY "Users can delete their own folder files"
ON storage.objects FOR DELETE
USING (bucket_id = 'school_os_folders' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Table pour stocker les dossiers du bureau avec leurs positions
CREATE TABLE IF NOT EXISTS public.desktop_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  is_public BOOLEAN NOT NULL DEFAULT false,
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les fichiers dans les dossiers
CREATE TABLE IF NOT EXISTS public.desktop_folder_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES public.desktop_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.desktop_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desktop_folder_files ENABLE ROW LEVEL SECURITY;

-- Policies pour desktop_folders
CREATE POLICY "Users can view their own folders"
ON public.desktop_folders FOR SELECT
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own folders"
ON public.desktop_folders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
ON public.desktop_folders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
ON public.desktop_folders FOR DELETE
USING (auth.uid() = user_id);

-- Policies pour desktop_folder_files
CREATE POLICY "Users can view files in accessible folders"
ON public.desktop_folder_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.desktop_folders df 
    WHERE df.id = folder_id AND (df.user_id = auth.uid() OR df.is_public = true)
  )
);

CREATE POLICY "Users can add files to their folders"
ON public.desktop_folder_files FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.desktop_folders df 
    WHERE df.id = folder_id AND df.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete files from their folders"
ON public.desktop_folder_files FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.desktop_folders df 
    WHERE df.id = folder_id AND df.user_id = auth.uid()
  )
);

-- Trigger pour updated_at
CREATE TRIGGER update_desktop_folders_updated_at
BEFORE UPDATE ON public.desktop_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();