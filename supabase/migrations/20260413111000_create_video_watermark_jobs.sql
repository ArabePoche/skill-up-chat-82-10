-- Jobs de watermark vidéo asynchrones avec export privé

CREATE TABLE IF NOT EXISTS public.video_watermark_jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'expired')),
  stage            text NOT NULL DEFAULT 'Préparation du traitement',
  progress         integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  source_url       text NOT NULL,
  source_host      text NOT NULL,
  author_name      text NOT NULL,
  watermark_text   text NOT NULL,
  file_name        text NOT NULL,
  output_bucket    text NOT NULL DEFAULT 'watermark-exports',
  output_path      text,
  output_mime_type text NOT NULL DEFAULT 'video/mp4',
  error_message    text,
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts         integer NOT NULL DEFAULT 0,
  started_at       timestamptz,
  completed_at     timestamptz,
  failed_at        timestamptz,
  expires_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_watermark_jobs_requested_by
  ON public.video_watermark_jobs(requested_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_watermark_jobs_status
  ON public.video_watermark_jobs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_watermark_jobs_expires_at
  ON public.video_watermark_jobs(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.touch_video_watermark_jobs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_video_watermark_jobs_updated_at ON public.video_watermark_jobs;
CREATE TRIGGER trg_video_watermark_jobs_updated_at
  BEFORE UPDATE ON public.video_watermark_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_video_watermark_jobs_updated_at();

ALTER TABLE public.video_watermark_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "video_watermark_jobs_select_own" ON public.video_watermark_jobs;
CREATE POLICY "video_watermark_jobs_select_own"
  ON public.video_watermark_jobs
  FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid());

DROP POLICY IF EXISTS "video_watermark_jobs_insert_own" ON public.video_watermark_jobs;
CREATE POLICY "video_watermark_jobs_insert_own"
  ON public.video_watermark_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

DROP POLICY IF EXISTS "video_watermark_jobs_update_own" ON public.video_watermark_jobs;
CREATE POLICY "video_watermark_jobs_update_own"
  ON public.video_watermark_jobs
  FOR UPDATE
  TO authenticated
  USING (requested_by = auth.uid())
  WITH CHECK (requested_by = auth.uid());

INSERT INTO storage.buckets (id, name, public)
VALUES ('watermark-exports', 'watermark-exports', false)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;
