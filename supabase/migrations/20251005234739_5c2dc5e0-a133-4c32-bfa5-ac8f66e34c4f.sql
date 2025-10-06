-- Supprimer la politique problématique qui cause la récursion
DROP POLICY IF EXISTS "Students can view members of their promotions" ON public.student_promotions;

-- Créer une fonction security definer pour éviter la récursion
-- Cette fonction vérifie si un étudiant appartient à la même promotion
CREATE OR REPLACE FUNCTION public.is_student_in_same_promotion(_user_id uuid, _promotion_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_promotions
    WHERE student_id = _user_id
    AND promotion_id = _promotion_id
    AND is_active = true
  )
$$;

-- Créer une politique pour que les étudiants voient les membres de leurs promotions
CREATE POLICY "Students can view members of their promotions"
ON public.student_promotions
FOR SELECT
TO public
USING (
  public.is_student_in_same_promotion(auth.uid(), promotion_id)
);

-- Créer une politique pour que les professeurs voient tous les étudiants de leurs formations
CREATE POLICY "Teachers can view students in their formations"
ON public.student_promotions
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.promotions p
    WHERE p.id = student_promotions.promotion_id
    AND public.is_teacher_of_formation(auth.uid(), p.formation_id)
  )
);