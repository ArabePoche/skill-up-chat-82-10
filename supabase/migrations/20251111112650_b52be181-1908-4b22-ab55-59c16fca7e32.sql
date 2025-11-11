-- Créer le type énuméré pour le type d'école
CREATE TYPE school_type AS ENUM ('virtual', 'physical', 'both');

-- Ajouter la colonne school_type à la table schools
ALTER TABLE schools ADD COLUMN school_type school_type NOT NULL DEFAULT 'physical';

-- Supprimer les anciennes politiques qui causent la récursion
DROP POLICY IF EXISTS "Users can view their own schools" ON schools;
DROP POLICY IF EXISTS "Users can insert their own schools" ON schools;
DROP POLICY IF EXISTS "Users can update their own schools" ON schools;
DROP POLICY IF EXISTS "Users can delete their own schools" ON schools;

-- Créer de nouvelles politiques sans récursion
CREATE POLICY "Users can view their own schools"
  ON schools FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Verified users can insert schools"
  ON schools FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_verified = true
    )
  );

CREATE POLICY "Users can update their own schools"
  ON schools FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete their own schools"
  ON schools FOR DELETE
  USING (owner_id = auth.uid());