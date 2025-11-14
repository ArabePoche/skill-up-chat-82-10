-- Créer la table students_school pour stocker les élèves
CREATE TABLE IF NOT EXISTS public.students_school (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  school_year_id UUID NOT NULL REFERENCES public.school_years(id) ON DELETE CASCADE,
  
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  
  student_code TEXT,
  photo_url TEXT,
  
  -- Informations du parent/tuteur
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  
  -- Adresse
  address TEXT,
  city TEXT,
  
  -- Informations médicales (optionnel)
  medical_notes TEXT,
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'transferred')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS
ALTER TABLE public.students_school ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir les élèves de leur école
CREATE POLICY "Utilisateurs peuvent voir les élèves de leur école"
  ON public.students_school
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = students_school.school_id
      AND schools.owner_id = auth.uid()
    )
  );

-- Les propriétaires peuvent ajouter des élèves
CREATE POLICY "Propriétaires peuvent ajouter des élèves"
  ON public.students_school
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = students_school.school_id
      AND schools.owner_id = auth.uid()
    )
  );

-- Les propriétaires peuvent modifier les élèves
CREATE POLICY "Propriétaires peuvent modifier les élèves"
  ON public.students_school
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = students_school.school_id
      AND schools.owner_id = auth.uid()
    )
  );

-- Les propriétaires peuvent supprimer les élèves
CREATE POLICY "Propriétaires peuvent supprimer les élèves"
  ON public.students_school
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = students_school.school_id
      AND schools.owner_id = auth.uid()
    )
  );

-- Créer des index pour améliorer les performances
CREATE INDEX idx_students_school_school_id ON public.students_school(school_id);
CREATE INDEX idx_students_school_class_id ON public.students_school(class_id);
CREATE INDEX idx_students_school_school_year_id ON public.students_school(school_year_id);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_students_school_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER students_school_updated_at
  BEFORE UPDATE ON public.students_school
  FOR EACH ROW
  EXECUTE FUNCTION update_students_school_updated_at();