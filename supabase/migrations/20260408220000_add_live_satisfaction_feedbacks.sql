-- Table for viewer satisfaction feedback after a paid live session
CREATE TABLE IF NOT EXISTS public.live_satisfaction_feedbacks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  live_stream_id uuid NOT NULL REFERENCES public.user_live_streams(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_satisfied boolean NOT NULL,
  reason text,
  refund_requested boolean NOT NULL DEFAULT false,
  refund_status text NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT live_satisfaction_feedbacks_refund_status_check
    CHECK (refund_status IN ('none', 'pending', 'approved', 'rejected')),
  CONSTRAINT live_satisfaction_feedbacks_unique_viewer_live
    UNIQUE (live_stream_id, viewer_id)
);

-- Index for looking up feedbacks by live stream (admin review)
CREATE INDEX IF NOT EXISTS live_satisfaction_feedbacks_live_stream_id_idx
  ON public.live_satisfaction_feedbacks (live_stream_id);

-- Index for looking up refund requests (admin queue)
CREATE INDEX IF NOT EXISTS live_satisfaction_feedbacks_refund_status_idx
  ON public.live_satisfaction_feedbacks (refund_status)
  WHERE refund_status = 'pending';

-- RLS
ALTER TABLE public.live_satisfaction_feedbacks ENABLE ROW LEVEL SECURITY;

-- Viewers can insert their own feedback
CREATE POLICY "Viewers can insert own feedback"
  ON public.live_satisfaction_feedbacks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = viewer_id);

-- Viewers can read their own feedback
CREATE POLICY "Viewers can read own feedback"
  ON public.live_satisfaction_feedbacks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = viewer_id);

-- Admins (via service role) can read all feedbacks
CREATE POLICY "Service role can manage all feedbacks"
  ON public.live_satisfaction_feedbacks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
