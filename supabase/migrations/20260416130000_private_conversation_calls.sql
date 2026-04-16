ALTER TABLE public.call_sessions
  ALTER COLUMN formation_id DROP NOT NULL,
  ALTER COLUMN lesson_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS conversation_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'call_sessions_context_check'
  ) THEN
    ALTER TABLE public.call_sessions
      ADD CONSTRAINT call_sessions_context_check
      CHECK (
        (
          conversation_id IS NULL
          AND formation_id IS NOT NULL
          AND lesson_id IS NOT NULL
        )
        OR
        (
          conversation_id IS NOT NULL
          AND formation_id IS NULL
          AND lesson_id IS NULL
          AND receiver_id IS NOT NULL
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_call_sessions_conversation_id
  ON public.call_sessions (conversation_id)
  WHERE conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_call_sessions_receiver_status
  ON public.call_sessions (receiver_id, status)
  WHERE receiver_id IS NOT NULL;