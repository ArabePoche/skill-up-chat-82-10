
-- Corriger la jointure active_interviews.teacher_id → teachers.id
-- D'abord, supprimer les anciennes contraintes
ALTER TABLE public.active_interviews 
DROP CONSTRAINT IF EXISTS active_interviews_teacher_id_fkey;

-- Ajouter la bonne contrainte de clé étrangère
ALTER TABLE public.active_interviews
ADD CONSTRAINT active_interviews_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;

-- Corriger les politiques RLS pour utiliser la bonne jointure
DROP POLICY IF EXISTS "Teachers can view active interviews" ON public.active_interviews;
DROP POLICY IF EXISTS "Teachers can create active interviews" ON public.active_interviews;
DROP POLICY IF EXISTS "Teachers can update their own active interviews" ON public.active_interviews;
DROP POLICY IF EXISTS "Teachers can delete their own active interviews" ON public.active_interviews;

-- Créer les politiques RLS avec la bonne jointure
CREATE POLICY "Teachers can view active interviews" 
ON public.active_interviews FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE id = teacher_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can create active interviews" 
ON public.active_interviews FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE id = teacher_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can update their own active interviews" 
ON public.active_interviews FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE id = teacher_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can delete their own active interviews" 
ON public.active_interviews FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE id = teacher_id AND user_id = auth.uid()
  )
);

-- Créer table pour les conversations privées de stories
CREATE TABLE IF NOT EXISTS public.story_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id uuid NOT NULL REFERENCES public.user_stories(id) ON DELETE CASCADE,
  participant1_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant2_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(story_id, participant1_id, participant2_id)
);

-- Activer RLS sur story_conversations
ALTER TABLE public.story_conversations ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour story_conversations
CREATE POLICY "Users can view their story conversations" 
ON public.story_conversations FOR SELECT 
USING (participant1_id = auth.uid() OR participant2_id = auth.uid());

CREATE POLICY "Users can create story conversations" 
ON public.story_conversations FOR INSERT 
WITH CHECK (participant1_id = auth.uid() OR participant2_id = auth.uid());

-- Créer table pour les messages des conversations de stories
CREATE TABLE IF NOT EXISTS public.story_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.story_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  story_reference text, -- Pour stocker l'extrait de la story citée
  created_at timestamp with time zone DEFAULT now(),
  is_read boolean DEFAULT false
);

-- Activer RLS sur story_messages
ALTER TABLE public.story_messages ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour story_messages
CREATE POLICY "Users can view messages in their conversations" 
ON public.story_messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.story_conversations 
    WHERE id = conversation_id 
    AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
  )
);

CREATE POLICY "Users can create messages in their conversations" 
ON public.story_messages FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.story_conversations 
    WHERE id = conversation_id 
    AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
  )
);

CREATE POLICY "Users can update their own messages" 
ON public.story_messages FOR UPDATE 
USING (sender_id = auth.uid());
