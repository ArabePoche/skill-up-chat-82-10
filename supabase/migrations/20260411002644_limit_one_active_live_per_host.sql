WITH ranked_active_lives AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY host_id
      ORDER BY COALESCE(started_at, created_at) DESC, created_at DESC, id DESC
    ) AS row_num
  FROM public.user_live_streams
  WHERE status = 'active'
)
UPDATE public.user_live_streams AS live
SET
  status = 'ended',
  ended_at = COALESCE(live.ended_at, now())
FROM ranked_active_lives
WHERE ranked_active_lives.id = live.id
  AND ranked_active_lives.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS user_live_streams_one_active_live_per_host_idx
  ON public.user_live_streams (host_id)
  WHERE status = 'active';
