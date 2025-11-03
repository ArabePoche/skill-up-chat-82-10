-- Ajouter les colonnes pour les notifications de réactions sur les publications
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS reaction_type TEXT; -- 'like' ou 'comment'

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_notifications_post_id ON public.notifications(post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_video_id ON public.notifications(video_id);
CREATE INDEX IF NOT EXISTS idx_notifications_reaction_type ON public.notifications(reaction_type);