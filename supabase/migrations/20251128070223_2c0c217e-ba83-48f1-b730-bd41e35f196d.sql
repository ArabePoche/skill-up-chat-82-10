-- Politique pour permettre aux enseignants de voir les élèves de leurs classes
CREATE POLICY "Teachers can view students in their classes" 
ON public.students_school 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM class_subjects cs
    WHERE cs.class_id = students_school.class_id 
    AND cs.teacher_id = auth.uid()
  )
);