-- Ajouter le champ max_score (barème) à la table class_subjects
ALTER TABLE public.class_subjects
ADD COLUMN IF NOT EXISTS max_score numeric DEFAULT 20;

-- Mettre un commentaire sur la colonne
COMMENT ON COLUMN public.class_subjects.max_score IS 'Barème de notation pour cette matière dans cette classe (ex: 20, 10, 100)';