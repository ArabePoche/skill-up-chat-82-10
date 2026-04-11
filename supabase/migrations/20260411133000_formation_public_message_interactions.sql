CREATE TABLE IF NOT EXISTS public.formation_public_message_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.formation_public_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_formation_public_message_likes_message
  ON public.formation_public_message_likes(message_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.formation_public_message_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.formation_public_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment_type TEXT NOT NULL DEFAULT 'text' CHECK (comment_type IN ('text', 'audio')),
  content TEXT,
  audio_url TEXT,
  audio_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT formation_public_message_comments_payload_check CHECK (
    (comment_type = 'text' AND content IS NOT NULL AND length(trim(content)) > 0 AND audio_url IS NULL)
    OR (comment_type = 'audio' AND audio_url IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_formation_public_message_comments_message
  ON public.formation_public_message_comments(message_id, created_at DESC);

ALTER TABLE public.formation_public_message_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formation_public_message_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view formation public message likes" ON public.formation_public_message_likes
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.formation_public_messages m
    WHERE m.id = formation_public_message_likes.message_id
  )
);

CREATE POLICY "Users can like formation public messages" ON public.formation_public_message_likes
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.formation_public_messages m
    WHERE m.id = formation_public_message_likes.message_id
  )
);

CREATE POLICY "Users can unlike own formation public messages" ON public.formation_public_message_likes
FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can view formation public message comments" ON public.formation_public_message_comments
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.formation_public_messages m
    WHERE m.id = formation_public_message_comments.message_id
  )
);

CREATE POLICY "Users can create own formation public message comments" ON public.formation_public_message_comments
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.formation_public_messages m
    WHERE m.id = formation_public_message_comments.message_id
  )
);

CREATE POLICY "Users can update own formation public message comments" ON public.formation_public_message_comments
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can delete own formation public message comments" ON public.formation_public_message_comments
FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());