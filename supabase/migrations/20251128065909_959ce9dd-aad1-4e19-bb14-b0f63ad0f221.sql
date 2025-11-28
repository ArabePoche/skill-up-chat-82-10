
-- Politique pour permettre aux enseignants de voir les années scolaires de leur école
CREATE POLICY "Teachers can view school years" 
ON public.school_years 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM school_teachers 
    WHERE school_teachers.school_id = school_years.school_id 
    AND school_teachers.user_id = auth.uid()
    AND school_teachers.employment_status = 'active'
  )
);
