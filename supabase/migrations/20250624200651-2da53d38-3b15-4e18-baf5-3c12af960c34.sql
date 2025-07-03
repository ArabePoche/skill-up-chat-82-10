
-- Créer la table lesson_messages pour unifier la gestion des messages
CREATE TABLE public.lesson_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL,
  formation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  file_url TEXT,
  file_type TEXT,
  file_name TEXT,
  is_exercise_submission BOOLEAN DEFAULT FALSE,
  exercise_status TEXT CHECK (exercise_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ajouter les index pour les performances
CREATE INDEX idx_lesson_messages_lesson_id ON public.lesson_messages(lesson_id);
CREATE INDEX idx_lesson_messages_formation_id ON public.lesson_messages(formation_id);
CREATE INDEX idx_lesson_messages_sender_id ON public.lesson_messages(sender_id);

-- Activer RLS
ALTER TABLE public.lesson_messages ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les messages de leçon
CREATE POLICY "Users can view lesson messages for enrolled formations" 
ON public.lesson_messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_enrollments 
    WHERE user_id = auth.uid() AND formation_id = lesson_messages.formation_id
  )
  OR
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid() AND formation_id = lesson_messages.formation_id
  )
);

CREATE POLICY "Users can insert lesson messages for enrolled formations" 
ON public.lesson_messages FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() AND (
    EXISTS (
      SELECT 1 FROM public.user_enrollments 
      WHERE user_id = auth.uid() AND formation_id = lesson_messages.formation_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.teachers 
      WHERE user_id = auth.uid() AND formation_id = lesson_messages.formation_id
    )
  )
);

CREATE POLICY "Teachers can update exercise status" 
ON public.lesson_messages FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid() AND formation_id = lesson_messages.formation_id
  )
);

-- Migrer les données existantes de lesson_private_chat vers lesson_messages
INSERT INTO public.lesson_messages (
  lesson_id, 
  formation_id, 
  sender_id, 
  content, 
  message_type, 
  file_url, 
  created_at
)
SELECT 
  lesson_id,
  formation_id,
  sender_id,
  message as content,
  message_type,
  attachment_url as file_url,
  created_at
FROM public.lesson_private_chat
WHERE lesson_id IS NOT NULL AND formation_id IS NOT NULL;
