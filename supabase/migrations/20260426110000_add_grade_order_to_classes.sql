-- Ajouter le champ grade_order à la table classes
-- Permet d'ordonner les classes pour le passage automatique de fin d'année
-- Chaque école peut définir l'ordre de ses classes (ex: 1=CP, 2=CE1, 3=CE2, etc.)

ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS grade_order INTEGER DEFAULT 0;

-- Ajouter un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_classes_grade_order ON public.classes(school_id, school_year_id, cycle, grade_order);

-- Ajouter un commentaire
COMMENT ON COLUMN public.classes.grade_order IS 'Ordre de la classe dans le cycle pour le passage automatique (1 = première classe, 2 = deuxième, etc.)';
