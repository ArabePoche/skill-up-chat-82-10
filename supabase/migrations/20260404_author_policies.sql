-- Migration pour la gestion des formations par les créateurs
-- Permet aux créateurs de lire, modifier, supprimer et CRÉER leurs propres formations

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Authors can view their own formations" ON public.formations;
DROP POLICY IF EXISTS "Authors can update their own formations" ON public.formations;
DROP POLICY IF EXISTS "Authors can delete their own formations" ON public.formations;
DROP POLICY IF EXISTS "Authors can create their own formations" ON public.formations;

-- Politiques RLS pour les créateurs
CREATE POLICY "Authors can view their own formations" ON public.formations FOR SELECT USING (author_id = auth.uid());
CREATE POLICY "Authors can update their own formations" ON public.formations FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "Authors can delete their own formations" ON public.formations FOR DELETE USING (author_id = auth.uid());
CREATE POLICY "Authors can create their own formations" ON public.formations FOR INSERT WITH CHECK (author_id = auth.uid());
