CREATE TABLE IF NOT EXISTS public.formation_public_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id UUID NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  level_id UUID REFERENCES public.levels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'specific_level' CHECK (scope IN ('specific_level', 'all_levels')),
  media_type TEXT NOT NULL CHECK (media_type IN ('audio', 'video')),
  title TEXT,
  description TEXT,
  media_url TEXT NOT NULL,
  media_path TEXT,
  urgent BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT formation_public_messages_scope_level_check CHECK (
    (scope = 'all_levels' AND level_id IS NULL)
    OR (scope = 'specific_level' AND level_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_formation_public_messages_formation_active
  ON public.formation_public_messages(formation_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_formation_public_messages_level
  ON public.formation_public_messages(level_id)
  WHERE level_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.formation_public_message_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.formation_public_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_formation_public_message_views_user
  ON public.formation_public_message_views(user_id, completed_at DESC);

ALTER TABLE public.formation_public_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formation_public_message_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view formation public messages" ON public.formation_public_messages
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.formations f
      WHERE f.id = formation_public_messages.formation_id
        AND f.author_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.teacher_formations tf
      JOIN public.teachers t ON t.id = tf.teacher_id
      WHERE tf.formation_id = formation_public_messages.formation_id
        AND t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_subscriptions us
      WHERE us.formation_id = formation_public_messages.formation_id
        AND us.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
);

CREATE POLICY "Authors can create formation public messages" ON public.formation_public_messages
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND author_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1
      FROM public.formations f
      WHERE f.id = formation_public_messages.formation_id
        AND f.author_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
);

CREATE POLICY "Authors can update formation public messages" ON public.formation_public_messages
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.formations f
      WHERE f.id = formation_public_messages.formation_id
        AND f.author_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.formations f
      WHERE f.id = formation_public_messages.formation_id
        AND f.author_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
);

CREATE POLICY "Authors can delete formation public messages" ON public.formation_public_messages
FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.formations f
      WHERE f.id = formation_public_messages.formation_id
        AND f.author_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
);

CREATE POLICY "Users can view relevant public message views" ON public.formation_public_message_views
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.formation_public_messages m
      JOIN public.formations f ON f.id = m.formation_id
      WHERE m.id = formation_public_message_views.message_id
        AND f.author_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
);

CREATE POLICY "Users can create own public message views" ON public.formation_public_message_views
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.formation_public_messages m
    WHERE m.id = formation_public_message_views.message_id
  )
);

CREATE POLICY "Users can update own public message views" ON public.formation_public_message_views
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());