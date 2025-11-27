-- Rendre subject_id nullable car les notes de suivi ne sont pas forcément liées à une matière
ALTER TABLE school_teacher_student_notes ALTER COLUMN subject_id DROP NOT NULL;