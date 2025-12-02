-- Ajouter la colonne subject_id à la table grades
ALTER TABLE public.grades 
ADD COLUMN subject_id uuid REFERENCES subjects(id);

-- Créer un index pour les performances
CREATE INDEX IF NOT EXISTS idx_grades_subject ON grades(subject_id);

-- Supprimer l'ancienne contrainte d'unicité si elle existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grades_student_evaluation_unique') THEN
    ALTER TABLE grades DROP CONSTRAINT grades_student_evaluation_unique;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grades_student_id_evaluation_id_key') THEN
    ALTER TABLE grades DROP CONSTRAINT grades_student_id_evaluation_id_key;
  END IF;
END $$;

-- Créer une nouvelle contrainte d'unicité incluant subject_id
ALTER TABLE public.grades
ADD CONSTRAINT grades_student_evaluation_subject_unique 
UNIQUE (student_id, evaluation_id, subject_id);

-- Commentaire pour documentation
COMMENT ON COLUMN grades.subject_id IS 'Matière associée à la note (pour les évaluations multi-matières)';