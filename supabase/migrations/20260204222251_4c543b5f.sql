-- Table pour archiver les élèves (exclus ou transférés)
CREATE TABLE public.archived_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Référence à l'élève original
  original_student_id UUID NOT NULL,
  
  -- Toutes les données de l'élève au moment de l'archivage
  school_id UUID NOT NULL REFERENCES public.schools(id),
  class_id UUID REFERENCES public.classes(id),
  school_year_id UUID NOT NULL REFERENCES public.school_years(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  student_code TEXT,
  photo_url TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  address TEXT,
  city TEXT,
  medical_notes TEXT,
  family_id UUID,
  discount_percentage NUMERIC,
  discount_amount NUMERIC,
  father_name TEXT,
  mother_name TEXT,
  mother_occupation TEXT,
  father_occupation TEXT,
  birth_place TEXT,
  observations TEXT,
  
  -- Informations d'archivage
  archive_reason TEXT NOT NULL CHECK (archive_reason IN ('exclusion', 'transfer', 'other')),
  archive_comment TEXT,
  target_school_id UUID REFERENCES public.schools(id),
  target_school_name TEXT,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  archived_by UUID REFERENCES auth.users(id),
  
  -- État de restauration
  is_restored BOOLEAN NOT NULL DEFAULT false,
  restored_at TIMESTAMP WITH TIME ZONE,
  restored_by UUID REFERENCES auth.users(id),
  restored_to_class_id UUID REFERENCES public.classes(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX idx_archived_students_school_id ON public.archived_students(school_id);
CREATE INDEX idx_archived_students_archive_reason ON public.archived_students(archive_reason);
CREATE INDEX idx_archived_students_is_restored ON public.archived_students(is_restored);
CREATE INDEX idx_archived_students_student_code ON public.archived_students(student_code);

-- Activer RLS
ALTER TABLE public.archived_students ENABLE ROW LEVEL SECURITY;

-- Politique: Les propriétaires et staff peuvent voir les archives de leur école
CREATE POLICY "Users can view archived students of their school"
ON public.archived_students
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.school_staff 
    WHERE school_staff.school_id = archived_students.school_id 
    AND school_staff.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.school_teachers 
    WHERE school_teachers.school_id = archived_students.school_id 
    AND school_teachers.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.schools 
    WHERE schools.id = archived_students.school_id 
    AND schools.owner_id = auth.uid()
  )
);

-- Politique: Seuls les propriétaires peuvent archiver
CREATE POLICY "Owners can insert archived students"
ON public.archived_students
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.schools 
    WHERE schools.id = school_id 
    AND schools.owner_id = auth.uid()
  )
);

-- Politique: Seuls les propriétaires peuvent modifier
CREATE POLICY "Owners can update archived students"
ON public.archived_students
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.schools 
    WHERE schools.id = archived_students.school_id 
    AND schools.owner_id = auth.uid()
  )
);

-- Trigger pour updated_at (utilise la fonction existante ou en crée une nouvelle)
CREATE OR REPLACE FUNCTION public.update_archived_students_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_archived_students_updated_at
BEFORE UPDATE ON public.archived_students
FOR EACH ROW
EXECUTE FUNCTION public.update_archived_students_updated_at();