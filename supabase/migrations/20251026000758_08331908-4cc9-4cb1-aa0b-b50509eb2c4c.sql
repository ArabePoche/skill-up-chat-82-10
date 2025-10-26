-- Créer la table pour tracker les vues de vidéos
CREATE TABLE IF NOT EXISTS public.video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  watch_duration_seconds INTEGER DEFAULT 0,
  session_id TEXT
);

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON public.video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_user_id ON public.video_views(user_id);
CREATE INDEX IF NOT EXISTS idx_video_views_viewed_at ON public.video_views(viewed_at);

-- Activer RLS
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

-- Politique pour créer ses propres vues
CREATE POLICY "Users can create their own views"
  ON public.video_views
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Politique pour voir toutes les vues (pour les stats)
CREATE POLICY "Anyone can view video views"
  ON public.video_views
  FOR SELECT
  USING (true);

-- Fonction pour incrémenter le compteur de vues
CREATE OR REPLACE FUNCTION increment_video_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.videos
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = NEW.video_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour incrémenter automatiquement
CREATE TRIGGER increment_video_views_trigger
  AFTER INSERT ON public.video_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_video_views();