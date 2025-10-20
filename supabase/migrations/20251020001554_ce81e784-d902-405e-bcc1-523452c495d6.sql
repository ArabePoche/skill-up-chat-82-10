-- Supprimer l'ancienne contrainte
ALTER TABLE public.user_stories 
DROP CONSTRAINT IF EXISTS user_stories_content_type_check;

-- Ajouter la nouvelle contrainte qui inclut 'audio'
ALTER TABLE public.user_stories 
ADD CONSTRAINT user_stories_content_type_check 
CHECK (content_type = ANY (ARRAY['text'::text, 'image'::text, 'video'::text, 'audio'::text]));