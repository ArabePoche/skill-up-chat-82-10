-- Ajouter la colonne level_id à la table lesson_messages
ALTER TABLE public.lesson_messages 
ADD COLUMN level_id UUID;

-- Ajouter une contrainte de clé étrangère vers la table levels
ALTER TABLE public.lesson_messages 
ADD CONSTRAINT lesson_messages_level_id_fkey 
FOREIGN KEY (level_id) REFERENCES public.levels(id);

-- Créer un index pour optimiser les filtres sur level_id
CREATE INDEX idx_lesson_messages_level_id ON public.lesson_messages(level_id);

-- Mettre à jour les messages existants avec leur level_id
UPDATE public.lesson_messages 
SET level_id = (
  SELECT l.level_id 
  FROM public.lessons l 
  WHERE l.id = lesson_messages.lesson_id
)
WHERE level_id IS NULL;