-- Ajouter les colonnes custom_title et sentiment à la table school_teacher_student_notes
ALTER TABLE school_teacher_student_notes 
ADD COLUMN IF NOT EXISTS custom_title TEXT,
ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral'));