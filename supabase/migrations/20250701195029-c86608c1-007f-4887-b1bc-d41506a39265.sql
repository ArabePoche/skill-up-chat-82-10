
-- Politiques RLS pour active_interviews
-- Permettre aux professeurs de voir les entretiens actifs
CREATE POLICY "Teachers can view active interviews" 
ON public.active_interviews FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid()
  )
);

-- Permettre aux professeurs de créer des entretiens
CREATE POLICY "Teachers can create active interviews" 
ON public.active_interviews FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid() AND user_id = teacher_id
  )
);

-- Permettre aux professeurs de mettre à jour leurs propres entretiens
CREATE POLICY "Teachers can update their own active interviews" 
ON public.active_interviews FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid() AND user_id = teacher_id
  )
);

-- Permettre aux professeurs de supprimer leurs propres entretiens
CREATE POLICY "Teachers can delete their own active interviews" 
ON public.active_interviews FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid() AND user_id = teacher_id
  )
);

-- Activer RLS sur active_interviews
ALTER TABLE public.active_interviews ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour interview_evaluations
-- Permettre aux étudiants de voir leurs évaluations
CREATE POLICY "Students can view their evaluations" 
ON public.interview_evaluations FOR SELECT 
USING (student_id = auth.uid());

-- Permettre aux étudiants de mettre à jour leurs évaluations (répondre à l'enquête)
CREATE POLICY "Students can update their evaluations" 
ON public.interview_evaluations FOR UPDATE 
USING (student_id = auth.uid() AND responded_at IS NULL);

-- Permettre aux professeurs de voir les évaluations de leurs entretiens
CREATE POLICY "Teachers can view their interview evaluations" 
ON public.interview_evaluations FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid() AND user_id = teacher_id
  )
);

-- Permettre la création d'évaluations (système)
CREATE POLICY "System can create interview evaluations" 
ON public.interview_evaluations FOR INSERT 
WITH CHECK (true);

-- Activer RLS sur interview_evaluations
ALTER TABLE public.interview_evaluations ENABLE ROW LEVEL SECURITY;

-- Ajouter une colonne ended_at pour tracking
ALTER TABLE public.active_interviews 
ADD COLUMN IF NOT EXISTS ended_at timestamp with time zone;
