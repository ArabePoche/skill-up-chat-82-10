-- Ajouter la colonne parent_comment_id pour les réponses aux commentaires
ALTER TABLE public.post_comments 
ADD COLUMN parent_comment_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE;

-- Créer un index pour améliorer les performances des requêtes de réponses
CREATE INDEX idx_post_comments_parent_id ON public.post_comments(parent_comment_id);

-- Ajouter une colonne pour compter les réponses
ALTER TABLE public.post_comments 
ADD COLUMN replies_count integer NOT NULL DEFAULT 0;

-- Fonction pour mettre à jour le compteur de réponses
CREATE OR REPLACE FUNCTION public.update_comment_replies_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NOT NULL THEN
    UPDATE public.post_comments 
    SET replies_count = GREATEST(0, COALESCE(replies_count, 0) + 1)
    WHERE id = NEW.parent_comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NOT NULL THEN
    UPDATE public.post_comments 
    SET replies_count = GREATEST(0, COALESCE(replies_count, 0) - 1)
    WHERE id = OLD.parent_comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger pour mettre à jour automatiquement le compteur de réponses
CREATE TRIGGER update_post_comment_replies_count
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_comment_replies_count();