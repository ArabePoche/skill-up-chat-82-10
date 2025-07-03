
-- Politiques RLS pour user_lesson_progress
-- Permettre aux admins de voir tous les progrès des utilisateurs
CREATE POLICY "Admins can view all user lesson progress" 
ON public.user_lesson_progress FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Permettre aux admins de créer des progrès pour n'importe quel utilisateur
CREATE POLICY "Admins can create user lesson progress" 
ON public.user_lesson_progress FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Permettre aux admins de mettre à jour tous les progrès
CREATE POLICY "Admins can update all user lesson progress" 
ON public.user_lesson_progress FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Permettre aux admins de supprimer tous les progrès
CREATE POLICY "Admins can delete all user lesson progress" 
ON public.user_lesson_progress FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Politiques RLS pour enrollment_requests
-- Permettre aux admins de mettre à jour toutes les demandes d'inscription
CREATE POLICY "Admins can update all enrollment requests" 
ON public.enrollment_requests FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Permettre aux admins de supprimer toutes les demandes d'inscription
CREATE POLICY "Admins can delete enrollment requests" 
ON public.enrollment_requests FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Politiques RLS pour lesson_messages
-- Permettre aux admins de voir tous les messages
CREATE POLICY "Admins can view all lesson messages" 
ON public.lesson_messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Permettre aux admins de créer des messages système
CREATE POLICY "Admins can create lesson messages" 
ON public.lesson_messages FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Permettre aux admins de mettre à jour tous les messages (validation d'exercices, etc.)
CREATE POLICY "Admins can update all lesson messages" 
ON public.lesson_messages FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Permettre aux admins de supprimer tous les messages
CREATE POLICY "Admins can delete all lesson messages" 
ON public.lesson_messages FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Politiques supplémentaires pour les utilisateurs normaux
-- Les utilisateurs peuvent voir leur propre progrès
CREATE POLICY "Users can view their own lesson progress" 
ON public.user_lesson_progress FOR SELECT 
USING (user_id = auth.uid());

-- Politique pour que les utilisateurs voient les messages qui leur sont destinés
CREATE POLICY "Users can view their lesson messages" 
ON public.lesson_messages FOR SELECT 
USING (
  sender_id = auth.uid() OR 
  receiver_id = auth.uid() OR 
  (receiver_id IS NULL AND EXISTS (
    SELECT 1 FROM public.enrollment_requests 
    WHERE user_id = auth.uid() 
      AND formation_id = lesson_messages.formation_id 
      AND status = 'approved'
  ))
);

-- Permettre aux utilisateurs de créer leurs propres messages
CREATE POLICY "Users can create their own lesson messages" 
ON public.lesson_messages FOR INSERT 
WITH CHECK (sender_id = auth.uid());
