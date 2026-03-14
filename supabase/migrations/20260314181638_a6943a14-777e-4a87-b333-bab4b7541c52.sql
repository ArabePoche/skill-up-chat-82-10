
-- Ajouter recruitment_ad_id aux posts pour lier les posts de recrutement aux annonces
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS recruitment_ad_id uuid REFERENCES public.recruitment_ads(id) ON DELETE SET NULL;

-- Ajouter recruitment_ad_id aux user_stories pour lier les stories de recrutement aux annonces
ALTER TABLE public.user_stories ADD COLUMN IF NOT EXISTS recruitment_ad_id uuid REFERENCES public.recruitment_ads(id) ON DELETE SET NULL;
