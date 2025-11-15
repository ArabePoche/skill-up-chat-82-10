-- Créer la table school_student_families pour gérer les liens familiaux
CREATE TABLE public.school_student_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  family_name TEXT NOT NULL,
  primary_contact_name TEXT,
  primary_contact_phone TEXT,
  primary_contact_email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ajouter une colonne family_id à la table students_school
ALTER TABLE public.students_school 
ADD COLUMN family_id UUID REFERENCES public.school_student_families(id) ON DELETE SET NULL;

-- Créer des index pour améliorer les performances
CREATE INDEX idx_school_student_families_school_id ON public.school_student_families(school_id);
CREATE INDEX idx_students_school_family_id ON public.students_school(family_id);

-- Activer RLS sur school_student_families
ALTER TABLE public.school_student_families ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour school_student_families
CREATE POLICY "Propriétaires peuvent voir les familles de leur école"
  ON public.school_student_families
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = school_student_families.school_id
      AND schools.owner_id = auth.uid()
    )
  );

CREATE POLICY "Propriétaires peuvent créer des familles"
  ON public.school_student_families
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = school_student_families.school_id
      AND schools.owner_id = auth.uid()
    )
  );

CREATE POLICY "Propriétaires peuvent modifier les familles de leur école"
  ON public.school_student_families
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = school_student_families.school_id
      AND schools.owner_id = auth.uid()
    )
  );

CREATE POLICY "Propriétaires peuvent supprimer les familles de leur école"
  ON public.school_student_families
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = school_student_families.school_id
      AND schools.owner_id = auth.uid()
    )
  );

-- Trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_school_student_families_updated_at
  BEFORE UPDATE ON public.school_student_families
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();