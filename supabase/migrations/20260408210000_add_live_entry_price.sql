-- Add entry_price column to user_live_streams for paid live sessions
ALTER TABLE public.user_live_streams
  ADD COLUMN IF NOT EXISTS entry_price numeric(12, 2) DEFAULT NULL;
