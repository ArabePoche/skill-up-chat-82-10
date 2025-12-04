-- Ajouter school_id à desktop_folders
ALTER TABLE public.desktop_folders ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

-- Mettre à jour les dossiers existants avec le school_id via school_staff
UPDATE public.desktop_folders df
SET school_id = ss.school_id
FROM school_staff ss
WHERE df.user_id = ss.user_id AND df.school_id IS NULL;

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Users can view their own folders or public school folders" ON public.desktop_folders;

-- Nouvelle politique simplifiée : voir ses propres dossiers OU les dossiers publics de la même école
CREATE POLICY "Users can view own folders or public school folders"
ON public.desktop_folders
FOR SELECT
USING (
  auth.uid() = user_id 
  OR (
    is_public = true 
    AND school_id IS NOT NULL
    AND (
      -- Membre du staff de l'école
      EXISTS (SELECT 1 FROM school_staff WHERE school_staff.school_id = desktop_folders.school_id AND school_staff.user_id = auth.uid())
      OR
      -- Propriétaire de l'école
      EXISTS (SELECT 1 FROM schools WHERE schools.id = desktop_folders.school_id AND schools.owner_id = auth.uid())
    )
  )
);