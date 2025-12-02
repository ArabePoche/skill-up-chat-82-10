-- Supprimer l'ancienne contrainte unique
ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_evaluation_id_student_id_key;

-- Créer une nouvelle contrainte unique incluant subject_id
ALTER TABLE grades ADD CONSTRAINT grades_evaluation_student_subject_unique 
  UNIQUE (evaluation_id, student_id, subject_id);