-- Mettre à jour les RLS policies pour utiliser teacher_formations au lieu de teachers.formation_id

-- Supprimer les anciennes policies qui utilisent formation_id sur teachers
DROP POLICY IF EXISTS "Teachers can update exercise status" ON public.lesson_messages;
DROP POLICY IF EXISTS "Teachers can view enrollment requests for their formations" ON public.enrollment_requests;

-- Recréer les policies avec la nouvelle structure teacher_formations
CREATE POLICY "Teachers can update exercise status" 
ON public.lesson_messages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers t
    JOIN public.teacher_formations tf ON t.id = tf.teacher_id
    WHERE t.user_id = auth.uid() 
    AND tf.formation_id = lesson_messages.formation_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teachers t
    JOIN public.teacher_formations tf ON t.id = tf.teacher_id
    WHERE t.user_id = auth.uid() 
    AND tf.formation_id = lesson_messages.formation_id
  )
);

-- Policy pour que les professeurs puissent voir les demandes d'inscription des formations où ils enseignent
CREATE POLICY "Teachers can view enrollment requests for their formations" 
ON public.enrollment_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers t
    JOIN public.teacher_formations tf ON t.id = tf.teacher_id
    WHERE t.user_id = auth.uid() 
    AND tf.formation_id = enrollment_requests.formation_id
  )
);

-- Mettre à jour la policy pour les entretiens actifs
DROP POLICY IF EXISTS "Teachers can view active interviews" ON public.active_interviews;
DROP POLICY IF EXISTS "Teachers can create active interviews" ON public.active_interviews;
DROP POLICY IF EXISTS "Teachers can update their own active interviews" ON public.active_interviews;
DROP POLICY IF EXISTS "Teachers can delete their own active interviews" ON public.active_interviews;

CREATE POLICY "Teachers can view active interviews" 
ON public.active_interviews 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers t
    WHERE t.user_id = auth.uid() 
    AND t.id = active_interviews.teacher_id
  )
);

CREATE POLICY "Teachers can create active interviews" 
ON public.active_interviews 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teachers t
    WHERE t.user_id = auth.uid() 
    AND t.id = active_interviews.teacher_id
  )
);

CREATE POLICY "Teachers can update their own active interviews" 
ON public.active_interviews 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers t
    WHERE t.user_id = auth.uid() 
    AND t.id = active_interviews.teacher_id
  )
);

CREATE POLICY "Teachers can delete their own active interviews" 
ON public.active_interviews 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers t
    WHERE t.user_id = auth.uid() 
    AND t.id = active_interviews.teacher_id
  )
);