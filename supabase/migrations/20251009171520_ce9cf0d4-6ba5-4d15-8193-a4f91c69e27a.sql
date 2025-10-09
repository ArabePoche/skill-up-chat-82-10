-- Politiques RLS pour la table user_follows

-- Les utilisateurs peuvent voir qui suit qui
CREATE POLICY "Users can view follows"
ON public.user_follows
FOR SELECT
TO authenticated
USING (true);

-- Les utilisateurs peuvent créer leurs propres follows
CREATE POLICY "Users can create their own follows"
ON public.user_follows
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id);

-- Les utilisateurs peuvent supprimer leurs propres follows
CREATE POLICY "Users can delete their own follows"
ON public.user_follows
FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);