
-- Corriger les politiques RLS pour lesson_messages
DROP POLICY IF EXISTS "Users can view lesson messages for enrolled formations" ON public.lesson_messages;
DROP POLICY IF EXISTS "Users can insert lesson messages for enrolled formations" ON public.lesson_messages;
DROP POLICY IF EXISTS "Teachers can update exercise status" ON public.lesson_messages;

-- Nouvelle politique pour la lecture des messages
-- Les étudiants voient leurs propres messages et ceux qui leur sont adressés
-- Les professeurs voient tous les messages de leurs formations
CREATE POLICY "Users can view lesson messages" 
ON public.lesson_messages FOR SELECT 
USING (
  -- L'utilisateur est l'expéditeur du message
  sender_id = auth.uid()
  OR
  -- L'utilisateur est le destinataire du message  
  receiver_id = auth.uid()
  OR
  -- L'utilisateur est un étudiant inscrit et le message lui est destiné ou vient de lui
  (
    EXISTS (
      SELECT 1 FROM public.enrollment_requests 
      WHERE user_id = auth.uid() 
        AND formation_id = lesson_messages.formation_id 
        AND status = 'approved'
    )
    AND (sender_id = auth.uid() OR receiver_id = auth.uid() OR receiver_id IS NULL)
  )
  OR
  -- L'utilisateur est un professeur de cette formation (accès complet)
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid() AND formation_id = lesson_messages.formation_id
  )
);

-- Nouvelle politique pour l'insertion des messages
-- Les étudiants peuvent envoyer des messages dans leurs formations
-- Les professeurs peuvent envoyer des messages aux étudiants de leurs formations
CREATE POLICY "Users can insert lesson messages" 
ON public.lesson_messages FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() 
  AND (
    -- L'utilisateur est un étudiant inscrit dans cette formation
    EXISTS (
      SELECT 1 FROM public.enrollment_requests 
      WHERE user_id = auth.uid() 
        AND formation_id = lesson_messages.formation_id 
        AND status = 'approved'
    )
    OR
    -- L'utilisateur est un professeur de cette formation
    EXISTS (
      SELECT 1 FROM public.teachers 
      WHERE user_id = auth.uid() AND formation_id = lesson_messages.formation_id
    )
  )
);

-- Politique pour la mise à jour (validation des exercices par les professeurs)
CREATE POLICY "Teachers can update exercise status" 
ON public.lesson_messages FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid() AND formation_id = lesson_messages.formation_id
  )
);
