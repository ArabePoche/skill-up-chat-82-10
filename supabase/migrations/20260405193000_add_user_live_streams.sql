CREATE TABLE IF NOT EXISTS public.user_live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends_followers')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  agora_channel text NOT NULL UNIQUE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_live_streams_host_status_idx
  ON public.user_live_streams(host_id, status, started_at DESC);

CREATE INDEX IF NOT EXISTS user_live_streams_status_visibility_idx
  ON public.user_live_streams(status, visibility, started_at DESC);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS live_stream_id uuid REFERENCES public.user_live_streams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS notifications_live_stream_id_idx
  ON public.notifications(live_stream_id);

ALTER TABLE public.user_live_streams ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_user_live_streams_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_user_live_streams_updated_at ON public.user_live_streams;

CREATE TRIGGER update_user_live_streams_updated_at
BEFORE UPDATE ON public.user_live_streams
FOR EACH ROW
EXECUTE FUNCTION public.set_user_live_streams_updated_at();

DROP POLICY IF EXISTS "Hosts can create their live streams" ON public.user_live_streams;
CREATE POLICY "Hosts can create their live streams"
ON public.user_live_streams
FOR INSERT
TO authenticated
WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS "Hosts can update their live streams" ON public.user_live_streams;
CREATE POLICY "Hosts can update their live streams"
ON public.user_live_streams
FOR UPDATE
TO authenticated
USING (host_id = auth.uid())
WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS "Hosts can delete their live streams" ON public.user_live_streams;
CREATE POLICY "Hosts can delete their live streams"
ON public.user_live_streams
FOR DELETE
TO authenticated
USING (host_id = auth.uid());

DROP POLICY IF EXISTS "Users can view allowed live streams" ON public.user_live_streams;
CREATE POLICY "Users can view allowed live streams"
ON public.user_live_streams
FOR SELECT
TO authenticated
USING (
  host_id = auth.uid()
  OR visibility = 'public'
  OR (
    visibility = 'friends_followers'
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_follows uf
        WHERE uf.following_id = host_id
          AND uf.follower_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.friend_requests fr
        WHERE fr.status = 'accepted'
          AND (
            (fr.sender_id = host_id AND fr.receiver_id = auth.uid())
            OR (fr.receiver_id = host_id AND fr.sender_id = auth.uid())
          )
      )
    )
  )
);