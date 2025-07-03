
-- S'assurer que lesson_id ne peut pas être NULL dans lesson_messages
ALTER TABLE public.lesson_messages 
ALTER COLUMN lesson_id SET NOT NULL;

-- Supprimer les messages existants qui ont lesson_id NULL (s'il y en a)
DELETE FROM public.lesson_messages WHERE lesson_id IS NULL;
