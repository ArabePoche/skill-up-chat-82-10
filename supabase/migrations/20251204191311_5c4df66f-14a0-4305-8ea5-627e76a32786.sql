-- Supprimer la policy problématique qui cause la récursion infinie
DROP POLICY IF EXISTS "Staff members and owners can view school staff" ON public.school_staff;

-- Créer une nouvelle policy sans auto-référence
CREATE POLICY "Staff members and owners can view school staff"
ON public.school_staff
FOR SELECT
USING (
  -- Le propriétaire de l'école peut voir son personnel
  EXISTS (
    SELECT 1 FROM schools
    WHERE schools.id = school_staff.school_id
    AND schools.owner_id = auth.uid()
  )
  OR
  -- Un membre du personnel peut voir les autres membres (vérification directe sans récursion)
  user_id = auth.uid()
);