-- Ajouter les colonnes pour les options de recrutement
ALTER TABLE public.posts
ADD COLUMN required_profiles TEXT[] DEFAULT NULL,
ADD COLUMN required_documents JSONB DEFAULT NULL,
ADD COLUMN geographic_zones TEXT[] DEFAULT NULL,
ADD COLUMN age_range JSONB DEFAULT NULL,
ADD COLUMN gender TEXT DEFAULT NULL;