-- Modifier la contrainte check sur le champ cycle de la table classes pour accepter les valeurs avec accents
-- Supprimer l'ancienne contrainte
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_cycle_check;

-- Ajouter la nouvelle contrainte avec les valeurs correctes (avec accents)
ALTER TABLE public.classes 
ADD CONSTRAINT classes_cycle_check 
CHECK (cycle IN ('maternel', 'primaire', 'collège', 'lycée', 'université'));
