
-- Corriger les relations manquantes dans active_interviews
-- D'abord, supprimer les contraintes existantes si elles existent
ALTER TABLE public.active_interviews 
DROP CONSTRAINT IF EXISTS active_interviews_teacher_id_fkey,
DROP CONSTRAINT IF EXISTS active_interviews_student_id_fkey,
DROP CONSTRAINT IF EXISTS active_interviews_lesson_id_fkey,
DROP CONSTRAINT IF EXISTS active_interviews_formation_id_fkey;

-- Ajouter la colonne ended_at si elle n'existe pas déjà
ALTER TABLE public.active_interviews 
ADD COLUMN IF NOT EXISTS ended_at timestamp with time zone;

-- Ajouter les bonnes contraintes de clés étrangères
ALTER TABLE public.active_interviews
ADD CONSTRAINT active_interviews_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES public.teachers(user_id) ON DELETE CASCADE,

ADD CONSTRAINT active_interviews_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE,

ADD CONSTRAINT active_interviews_lesson_id_fkey 
FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE,

ADD CONSTRAINT active_interviews_formation_id_fkey 
FOREIGN KEY (formation_id) REFERENCES public.formations(id) ON DELETE CASCADE;

-- Corriger les politiques RLS pour active_interviews
DROP POLICY IF EXISTS "Teachers can view active interviews" ON public.active_interviews;
DROP POLICY IF EXISTS "Teachers can create active interviews" ON public.active_interviews;
DROP POLICY IF EXISTS "Teachers can update their own active interviews" ON public.active_interviews;
DROP POLICY IF EXISTS "Teachers can delete their own active interviews" ON public.active_interviews;
DROP POLICY IF EXISTS "System can create interview evaluations" ON public.interview_evaluations;
DROP POLICY IF EXISTS "Teachers can view their interview evaluations" ON public.interview_evaluations;

-- Créer les bonnes politiques RLS
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
    WHERE user_id = auth.uid() AND user_id = teacher_id
  )
);

CREATE POLICY "Teachers can update their own active interviews" 
ON public.active_interviews FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid() AND user_id = teacher_id
  )
);

CREATE POLICY "Teachers can delete their own active interviews" 
ON public.active_interviews FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid() AND user_id = teacher_id
  )
);

-- Politiques pour interview_evaluations
CREATE POLICY "System can create interview evaluations" 
ON public.interview_evaluations FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Teachers can view their interview evaluations" 
ON public.interview_evaluations FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid() AND user_id = teacher_id
  )
);

-- Activer RLS sur active_interviews si pas déjà fait
ALTER TABLE public.active_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_evaluations ENABLE ROW LEVEL SECURITY;
