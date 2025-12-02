-- Ajouter les colonnes de planning par matière dans school_evaluation_class_subjects
ALTER TABLE public.school_evaluation_class_subjects
ADD COLUMN IF NOT EXISTS evaluation_date date,
ADD COLUMN IF NOT EXISTS start_time time,
ADD COLUMN IF NOT EXISTS end_time time;

-- Commentaires pour documentation
COMMENT ON COLUMN public.school_evaluation_class_subjects.evaluation_date IS 'Date de l''évaluation pour cette matière';
COMMENT ON COLUMN public.school_evaluation_class_subjects.start_time IS 'Heure de début de l''évaluation pour cette matière';
COMMENT ON COLUMN public.school_evaluation_class_subjects.end_time IS 'Heure de fin de l''évaluation pour cette matière';