
-- Supprimer la politique incorrecte
DROP POLICY IF EXISTS "Teachers can create evaluations" ON public.interview_evaluations;

-- Créer une nouvelle politique correcte pour permettre aux professeurs de créer des évaluations
CREATE POLICY "Teachers can create evaluations" 
ON public.interview_evaluations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid() AND id = interview_evaluations.teacher_id
  )
);
