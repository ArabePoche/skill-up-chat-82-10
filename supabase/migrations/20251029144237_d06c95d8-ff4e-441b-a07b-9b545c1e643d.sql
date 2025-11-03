-- Politiques RLS pour user_streaks
-- Permettre aux utilisateurs de voir leurs propres streaks
CREATE POLICY "Users can view their own streaks"
ON user_streaks
FOR SELECT
USING (auth.uid() = user_id);

-- Permettre aux utilisateurs d'insérer leurs propres streaks
CREATE POLICY "Users can insert their own streaks"
ON user_streaks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Permettre aux utilisateurs de mettre à jour leurs propres streaks
CREATE POLICY "Users can update their own streaks"
ON user_streaks
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Permettre aux utilisateurs de supprimer leurs propres streaks
CREATE POLICY "Users can delete their own streaks"
ON user_streaks
FOR DELETE
USING (auth.uid() = user_id);