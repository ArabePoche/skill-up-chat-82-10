
-- Table pour persister les spectateurs de live
CREATE TABLE public.live_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_viewer_per_live UNIQUE (live_id, user_id)
);

-- Index pour les requêtes de rapport
CREATE INDEX idx_live_viewers_live_id ON public.live_viewers(live_id);
CREATE INDEX idx_live_viewers_user_id ON public.live_viewers(user_id);

-- RLS
ALTER TABLE public.live_viewers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view live viewers"
  ON public.live_viewers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can register their own presence"
  ON public.live_viewers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence"
  ON public.live_viewers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
