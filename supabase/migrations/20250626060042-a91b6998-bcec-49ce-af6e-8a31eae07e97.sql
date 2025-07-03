
-- Créer la table pour les statuts éphémères
CREATE TABLE public.user_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'image', 'video')),
  content_text TEXT,
  media_url TEXT,
  background_color TEXT DEFAULT '#25d366',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Table pour tracker qui a vu quel statut
CREATE TABLE public.story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.user_stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- RLS pour user_stories
ALTER TABLE public.user_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active stories from people they follow or their own" 
ON public.user_stories FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (is_active = true AND expires_at > now())
);

CREATE POLICY "Users can create their own stories" 
ON public.user_stories FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories" 
ON public.user_stories FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" 
ON public.user_stories FOR DELETE 
USING (auth.uid() = user_id);

-- RLS pour story_views
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view story views for their own stories" 
ON public.story_views FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_stories 
    WHERE id = story_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can record views on stories" 
ON public.story_views FOR INSERT 
WITH CHECK (auth.uid() = viewer_id);

-- Fonction pour nettoyer automatiquement les statuts expirés
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.user_stories 
  SET is_active = false 
  WHERE expires_at < now() AND is_active = true;
END;
$$;

-- Créer un bucket pour les médias des statuts si nécessaire
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-media', 'story-media', true)
ON CONFLICT (id) DO NOTHING;

-- Politique de stockage pour les médias des statuts
CREATE POLICY "Story media upload policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'story-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Story media select policy" ON storage.objects
FOR SELECT USING (bucket_id = 'story-media');

CREATE POLICY "Story media delete policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'story-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
