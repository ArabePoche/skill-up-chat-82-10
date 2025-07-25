
-- Supprimer toutes les politiques existantes puis les recréer

-- Supprimer les politiques existantes pour lessons
DROP POLICY IF EXISTS "Admins can view all lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can create lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can update lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can delete lessons" ON public.lessons;

-- Recréer les politiques pour lessons
CREATE POLICY "Admins can view all lessons" 
ON public.lessons FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can create lessons" 
ON public.lessons FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update lessons" 
ON public.lessons FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete lessons" 
ON public.lessons FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Supprimer et recréer les politiques pour notifications
DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "Admins and system can create notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
  OR auth.uid() IS NULL -- Permettre les insertions système (triggers)
);

-- Supprimer et recréer les politiques pour user_lesson_progress
DROP POLICY IF EXISTS "Admins can create user lesson progress" ON public.user_lesson_progress;
DROP POLICY IF EXISTS "System can create user lesson progress" ON public.user_lesson_progress;

CREATE POLICY "Admins and system can create user lesson progress" 
ON public.user_lesson_progress FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
  OR auth.uid() IS NULL -- Permettre les insertions système (triggers)
);

-- Supprimer et recréer les politiques pour lesson_messages
DROP POLICY IF EXISTS "Admins can create lesson messages" ON public.lesson_messages;
DROP POLICY IF EXISTS "System can create lesson messages" ON public.lesson_messages;

CREATE POLICY "Admins and system can create lesson messages" 
ON public.lesson_messages FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
  OR auth.uid() IS NULL -- Permettre les insertions système (triggers)
);

-- Activer RLS sur les tables (ne fait rien si déjà activé)
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
