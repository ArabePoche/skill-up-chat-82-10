-- Ajouter les nouveaux champs à recruitment_ads pour les documents requis, postes, adresse complète
ALTER TABLE public.recruitment_ads 
  ADD COLUMN IF NOT EXISTS required_documents text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS positions text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS full_address text DEFAULT '';
