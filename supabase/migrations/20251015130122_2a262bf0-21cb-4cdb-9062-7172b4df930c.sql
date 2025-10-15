-- Créer la table series
CREATE TABLE public.series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Créer la table series_videos
CREATE TABLE public.series_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(series_id, video_id)
);

-- Enable RLS
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_videos ENABLE ROW LEVEL SECURITY;

-- Policies pour series
CREATE POLICY "Users can view all series"
  ON public.series FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own series"
  ON public.series FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own series"
  ON public.series FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own series"
  ON public.series FOR DELETE
  USING (auth.uid() = user_id);

-- Policies pour series_videos
CREATE POLICY "Users can view all series_videos"
  ON public.series_videos FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their series videos"
  ON public.series_videos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_videos.series_id
      AND series.user_id = auth.uid()
    )
  );

-- Index pour améliorer les performances
CREATE INDEX idx_series_user_id ON public.series(user_id);
CREATE INDEX idx_series_videos_series_id ON public.series_videos(series_id);
CREATE INDEX idx_series_videos_video_id ON public.series_videos(video_id);