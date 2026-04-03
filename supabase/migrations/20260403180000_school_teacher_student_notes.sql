-- Créer la table des notes de suivi des enseignants
CREATE TABLE public.school_teacher_student_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students_school(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  academic_level TEXT,
  behavior TEXT,
  progress TEXT,
  difficulties TEXT,
  recommendations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX idx_school_teacher_student_notes_teacher ON public.school_teacher_student_notes(teacher_id);
CREATE INDEX idx_school_teacher_student_notes_student ON public.school_teacher_student_notes(student_id);
CREATE INDEX idx_school_teacher_student_notes_class ON public.school_teacher_student_notes(class_id);
CREATE INDEX idx_school_teacher_student_notes_school ON public.school_teacher_student_notes(school_id);

-- Activer Row Level Security
ALTER TABLE public.school_teacher_student_notes ENABLE ROW LEVEL SECURITY;

-- Politique : Les enseignants peuvent créer des notes
CREATE POLICY "Enseignants peuvent créer des notes de suivi"
ON public.school_teacher_student_notes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = teacher_id);

-- Politique : Les enseignants peuvent voir leurs propres notes
CREATE POLICY "Enseignants peuvent voir leurs notes"
ON public.school_teacher_student_notes
FOR SELECT
TO authenticated
USING (auth.uid() = teacher_id);

-- Politique : Les enseignants peuvent modifier leurs propres notes
CREATE POLICY "Enseignants peuvent modifier leurs notes"
ON public.school_teacher_student_notes
FOR UPDATE
TO authenticated
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

-- Politique : Les enseignants peuvent supprimer leurs propres notes
CREATE POLICY "Enseignants peuvent supprimer leurs notes"
ON public.school_teacher_student_notes
FOR DELETE
TO authenticated
USING (auth.uid() = teacher_id);

-- Politique : Les admins peuvent voir toutes les notes
CREATE POLICY "Admins peuvent voir toutes les notes"
ON public.school_teacher_student_notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_school_teacher_student_notes_updated_at
BEFORE UPDATE ON public.school_teacher_student_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
