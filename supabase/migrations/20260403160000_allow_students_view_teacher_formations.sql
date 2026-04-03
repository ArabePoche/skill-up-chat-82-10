-- Permettre à tout utilisateur authentifié (élèves) de voir quels professeurs donnent quelles formations
-- Cela est nécessaire pour que les élèves puissent envoyer des notifications push aux professeurs lors de la soumission d'exercices.

DROP POLICY IF EXISTS "Authenticated users can view teacher_formations" ON public.teacher_formations;
CREATE POLICY "Authenticated users can view teacher_formations" ON public.teacher_formations
  FOR SELECT TO authenticated
  USING (true);
