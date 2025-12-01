-- Supprimer la contrainte existante sur student_id si elle existe
ALTER TABLE public.grades 
DROP CONSTRAINT IF EXISTS grades_student_id_fkey;

-- Créer un index pour les performances
CREATE INDEX IF NOT EXISTS idx_grades_student_evaluation 
ON public.grades(student_id, evaluation_id);

-- Créer un index pour les recherches par évaluation
CREATE INDEX IF NOT EXISTS idx_grades_evaluation_id 
ON public.grades(evaluation_id);

-- S'assurer que RLS est activé
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view their own grades" ON public.grades;
DROP POLICY IF EXISTS "Users can update their own grades" ON public.grades;
DROP POLICY IF EXISTS "Teachers can view grades for their classes" ON public.grades;
DROP POLICY IF EXISTS "Teachers can insert grades for their classes" ON public.grades;
DROP POLICY IF EXISTS "Teachers can update grades for their classes" ON public.grades;
DROP POLICY IF EXISTS "Teachers can delete grades for their classes" ON public.grades;

-- Politique pour permettre aux enseignants de voir les notes de leurs classes
CREATE POLICY "Teachers can view grades for their classes" 
ON public.grades 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM evaluations e
    JOIN class_subjects cs ON e.class_subject_id = cs.id
    WHERE e.id = grades.evaluation_id
    AND (
      cs.teacher_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM school_user_roles sur
        JOIN school_roles sr ON sur.role_id = sr.id
        JOIN classes c ON c.school_id = sur.school_id
        WHERE c.id = cs.class_id
        AND sur.user_id = auth.uid()
        AND sr.name IN ('owner', 'admin', 'director')
      )
    )
  )
);

-- Politique pour permettre aux enseignants de créer des notes
CREATE POLICY "Teachers can insert grades for their classes" 
ON public.grades 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM evaluations e
    JOIN class_subjects cs ON e.class_subject_id = cs.id
    WHERE e.id = evaluation_id
    AND (
      cs.teacher_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM school_user_roles sur
        JOIN school_roles sr ON sur.role_id = sr.id
        JOIN classes c ON c.school_id = sur.school_id
        WHERE c.id = cs.class_id
        AND sur.user_id = auth.uid()
        AND sr.name IN ('owner', 'admin', 'director')
      )
    )
  )
);

-- Politique pour permettre aux enseignants de modifier les notes
CREATE POLICY "Teachers can update grades for their classes" 
ON public.grades 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM evaluations e
    JOIN class_subjects cs ON e.class_subject_id = cs.id
    WHERE e.id = grades.evaluation_id
    AND (
      cs.teacher_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM school_user_roles sur
        JOIN school_roles sr ON sur.role_id = sr.id
        JOIN classes c ON c.school_id = sur.school_id
        WHERE c.id = cs.class_id
        AND sur.user_id = auth.uid()
        AND sr.name IN ('owner', 'admin', 'director')
      )
    )
  )
);

-- Politique pour permettre la suppression des notes
CREATE POLICY "Teachers can delete grades for their classes" 
ON public.grades 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM evaluations e
    JOIN class_subjects cs ON e.class_subject_id = cs.id
    WHERE e.id = grades.evaluation_id
    AND (
      cs.teacher_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM school_user_roles sur
        JOIN school_roles sr ON sur.role_id = sr.id
        JOIN classes c ON c.school_id = sur.school_id
        WHERE c.id = cs.class_id
        AND sur.user_id = auth.uid()
        AND sr.name IN ('owner', 'admin', 'director')
      )
    )
  )
);