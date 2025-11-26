-- Ajouter les champs manquants à la table subjects
ALTER TABLE public.subjects 
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS color text DEFAULT '#3B82F6';

-- Créer un index pour optimiser les requêtes par école
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON public.subjects(school_id);

-- Mettre à jour les politiques RLS pour subjects
DROP POLICY IF EXISTS "Authenticated users can view subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
DROP POLICY IF EXISTS "School owners can manage their subjects" ON public.subjects;

-- Politique de lecture : utilisateurs peuvent voir les matières de leur école
CREATE POLICY "Users can view subjects of their school"
ON public.subjects FOR SELECT
USING (
  school_id IN (
    SELECT id FROM schools WHERE owner_id = auth.uid()
  )
  OR school_id IS NULL
);

-- Politique de création : propriétaires d'école peuvent créer des matières
CREATE POLICY "School owners can create subjects"
ON public.subjects FOR INSERT
WITH CHECK (
  school_id IN (
    SELECT id FROM schools WHERE owner_id = auth.uid()
  )
);

-- Politique de modification : propriétaires d'école peuvent modifier leurs matières
CREATE POLICY "School owners can update their subjects"
ON public.subjects FOR UPDATE
USING (
  school_id IN (
    SELECT id FROM schools WHERE owner_id = auth.uid()
  )
);

-- Politique de suppression : propriétaires d'école peuvent supprimer leurs matières
CREATE POLICY "School owners can delete their subjects"
ON public.subjects FOR DELETE
USING (
  school_id IN (
    SELECT id FROM schools WHERE owner_id = auth.uid()
  )
);