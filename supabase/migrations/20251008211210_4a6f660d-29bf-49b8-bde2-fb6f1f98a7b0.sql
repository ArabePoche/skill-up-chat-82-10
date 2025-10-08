-- Créer la table post_likes
CREATE TABLE public.post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Index pour améliorer les performances
CREATE INDEX idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON public.post_likes(user_id);

-- Activer RLS
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs peuvent voir tous les likes
CREATE POLICY "Utilisateurs peuvent voir tous les likes"
ON public.post_likes
FOR SELECT
USING (true);

-- Politique : les utilisateurs peuvent liker des posts
CREATE POLICY "Utilisateurs peuvent liker des posts"
ON public.post_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique : les utilisateurs peuvent supprimer leurs propres likes
CREATE POLICY "Utilisateurs peuvent supprimer leurs likes"
ON public.post_likes
FOR DELETE
USING (auth.uid() = user_id);