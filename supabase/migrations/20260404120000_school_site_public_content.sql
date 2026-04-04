-- Contenu éditable du site public d'une école (propriétaire)
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS site_cycles_programs text,
  ADD COLUMN IF NOT EXISTS site_gallery_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS site_facebook_url text,
  ADD COLUMN IF NOT EXISTS site_instagram_url text,
  ADD COLUMN IF NOT EXISTS site_twitter_url text,
  ADD COLUMN IF NOT EXISTS site_linkedin_url text,
  ADD COLUMN IF NOT EXISTS site_youtube_url text;

COMMENT ON COLUMN public.schools.site_cycles_programs IS 'Cycles et programmes affichés sur le site public';
COMMENT ON COLUMN public.schools.site_gallery_urls IS 'URLs des images de la galerie du site public';
