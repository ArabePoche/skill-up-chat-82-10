
-- Créer le nouveau bucket lesson_discussion_files
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

-- Supprimer l'ancien bucket lesson-files s'il existe
DELETE FROM storage.objects WHERE bucket_id = 'lesson-files';
DELETE FROM storage.buckets WHERE id = 'lesson-files';

-- Créer des politiques RLS pour permettre aux admins d'accéder aux tables nécessaires
-- Politique pour que les admins puissent voir toutes les formations
CREATE POLICY "Admins can view all formations" ON public.formations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Politique pour que les admins puissent créer des formations
CREATE POLICY "Admins can create formations" ON public.formations
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Politique pour que les admins puissent modifier des formations
CREATE POLICY "Admins can update formations" ON public.formations
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Politique pour que les admins puissent supprimer des formations
CREATE POLICY "Admins can delete formations" ON public.formations
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Activer RLS sur la table formations si ce n'est pas déjà fait
ALTER TABLE public.formations ENABLE ROW LEVEL SECURITY;

-- Politiques similaires pour la table products
CREATE POLICY "Admins can view all products" ON public.products
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can create products" ON public.products
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update products" ON public.products
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete products" ON public.products
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Activer RLS sur la table products si ce n'est pas déjà fait
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Politiques pour la table profiles (pour que les admins puissent voir tous les utilisateurs)
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) OR id = auth.uid()
);

-- Activer RLS sur la table profiles si ce n'est pas déjà fait
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
