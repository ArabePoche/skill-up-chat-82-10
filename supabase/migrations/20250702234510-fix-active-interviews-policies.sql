
-- Corriger les politiques RLS pour active_interviews
-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Teachers can view active interviews" ON public.active_interviews;
DROP POLICY IF EXISTS "Teachers can create active interviews" ON public.active_interviews;
DROP POLICY IF EXISTS "Teachers can update their own active interviews" ON public.active_interviews;
DROP POLICY IF EXISTS "Teachers can delete their own active interviews" ON public.active_interviews;

-- Créer les bonnes politiques RLS avec les bonnes relations
CREATE POLICY "Teachers can view active interviews" 
ON public.active_interviews FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can create active interviews" 
ON public.active_interviews FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid() AND id = active_interviews.teacher_id
  )
);

CREATE POLICY "Teachers can update their own active interviews" 
ON public.active_interviews FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid() AND id = active_interviews.teacher_id
  )
);

CREATE POLICY "Teachers can delete their own active interviews" 
ON public.active_interviews FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid() AND id = active_interviews.teacher_id
  )
);
