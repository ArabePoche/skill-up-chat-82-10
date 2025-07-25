
-- Création de la table posts
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('recruitment', 'info', 'general')),
  author_id UUID NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS pour la table posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre à tous de voir les posts actifs
CREATE POLICY "Anyone can view active posts" 
  ON public.posts 
  FOR SELECT 
  USING (is_active = true);

-- Politique pour permettre aux utilisateurs connectés de créer des posts
CREATE POLICY "Authenticated users can create posts" 
  ON public.posts 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());

-- Politique pour permettre aux auteurs de modifier leurs posts
CREATE POLICY "Authors can update their own posts" 
  ON public.posts 
  FOR UPDATE 
  USING (auth.uid() = author_id);

-- Créer un bucket de stockage pour les images des posts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-images', 'post-images', true);

-- Politique pour permettre l'upload d'images
CREATE POLICY "Anyone can upload post images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'post-images');

-- Politique pour permettre la lecture des images
CREATE POLICY "Anyone can view post images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'post-images');
