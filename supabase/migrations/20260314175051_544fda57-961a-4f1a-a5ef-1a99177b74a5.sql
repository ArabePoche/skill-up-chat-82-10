
ALTER TABLE public.recruitment_ads 
  ADD COLUMN IF NOT EXISTS publish_as_post boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS publish_as_status boolean DEFAULT false;
