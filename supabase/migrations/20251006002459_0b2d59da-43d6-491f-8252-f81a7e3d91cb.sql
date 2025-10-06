-- Permettre aux élèves de voir les niveaux de leurs camarades de promotion

-- Ajouter une politique pour que les élèves voient les progressions des autres élèves de leur promotion
CREATE POLICY "Students can view progress of promotion members"
ON public.user_lesson_progress
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.student_promotions sp1
    JOIN public.student_promotions sp2 ON sp1.promotion_id = sp2.promotion_id
    WHERE sp1.student_id = auth.uid()
      AND sp2.student_id = user_lesson_progress.user_id
      AND sp1.is_active = true
      AND sp2.is_active = true
  )
);