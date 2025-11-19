-- Create school_teachers table
CREATE TABLE public.school_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  teacher_type TEXT NOT NULL CHECK (teacher_type IN ('generaliste', 'specialiste')),
  specialties TEXT[], -- Pour les spécialistes (ex: ['Mathématiques', 'Sciences'])
  
  -- Informations d'emploi (gérées par l'admin)
  base_salary DECIMAL(10,2),
  salary_currency TEXT DEFAULT 'EUR',
  payment_frequency TEXT CHECK (payment_frequency IN ('mensuel', 'annuel', 'horaire')),
  hire_date DATE,
  contract_type TEXT CHECK (contract_type IN ('CDI', 'CDD', 'vacation', 'stage')),
  employment_status TEXT DEFAULT 'active' CHECK (employment_status IN ('active', 'suspended', 'terminated')),
  
  -- Métadonnées
  application_status TEXT DEFAULT 'pending' CHECK (application_status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(school_id, email)
);

-- Enable RLS
ALTER TABLE public.school_teachers ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can create their own application
CREATE POLICY "Teachers can create their application"
ON public.school_teachers
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Teachers can view their own profile
CREATE POLICY "Teachers can view their profile"
ON public.school_teachers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Teachers can update their basic info (not salary/employment)
CREATE POLICY "Teachers can update basic info"
ON public.school_teachers
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() AND
  -- Prevent teachers from modifying these admin-only fields
  base_salary IS NOT DISTINCT FROM (SELECT base_salary FROM school_teachers WHERE id = school_teachers.id) AND
  payment_frequency IS NOT DISTINCT FROM (SELECT payment_frequency FROM school_teachers WHERE id = school_teachers.id) AND
  hire_date IS NOT DISTINCT FROM (SELECT hire_date FROM school_teachers WHERE id = school_teachers.id) AND
  contract_type IS NOT DISTINCT FROM (SELECT contract_type FROM school_teachers WHERE id = school_teachers.id) AND
  employment_status IS NOT DISTINCT FROM (SELECT employment_status FROM school_teachers WHERE id = school_teachers.id)
);

-- Policy: School owners can view all teachers in their school
CREATE POLICY "School owners can view their teachers"
ON public.school_teachers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.schools
    WHERE schools.id = school_teachers.school_id
    AND schools.owner_id = auth.uid()
  )
);

-- Policy: School owners can update their teachers
CREATE POLICY "School owners can update their teachers"
ON public.school_teachers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.schools
    WHERE schools.id = school_teachers.school_id
    AND schools.owner_id = auth.uid()
  )
);

-- Policy: School owners can approve/reject applications
CREATE POLICY "School owners can manage applications"
ON public.school_teachers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.schools
    WHERE schools.id = school_teachers.school_id
    AND schools.owner_id = auth.uid()
  )
);

-- Create school_teacher_classes junction table
CREATE TABLE public.school_teacher_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.school_teachers(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  subject TEXT, -- Matière enseignée
  hours_per_week DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(teacher_id, class_id, subject)
);

-- Enable RLS
ALTER TABLE public.school_teacher_classes ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can view their assigned classes
CREATE POLICY "Teachers can view their classes"
ON public.school_teacher_classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.school_teachers
    WHERE school_teachers.id = school_teacher_classes.teacher_id
    AND school_teachers.user_id = auth.uid()
  )
);

-- Policy: School owners can manage class assignments
CREATE POLICY "School owners can manage class assignments"
ON public.school_teacher_classes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.school_teachers st
    JOIN public.schools s ON s.id = st.school_id
    WHERE st.id = school_teacher_classes.teacher_id
    AND s.owner_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_school_teachers_updated_at
BEFORE UPDATE ON public.school_teachers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();