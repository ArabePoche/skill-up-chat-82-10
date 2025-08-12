
-- Corriger la politique RLS pour permettre la suppression des posts par leur auteur
DROP POLICY IF EXISTS "Authors can delete their own posts" ON public.posts;

CREATE POLICY "Authors can delete their own posts" 
ON public.posts 
FOR UPDATE 
USING (author_id = auth.uid()) 
WITH CHECK (author_id = auth.uid());

-- Ajouter une politique pour les vrais DELETE si nécessaire
CREATE POLICY "Authors can hard delete their own posts" 
ON public.posts 
FOR DELETE 
USING (author_id = auth.uid());