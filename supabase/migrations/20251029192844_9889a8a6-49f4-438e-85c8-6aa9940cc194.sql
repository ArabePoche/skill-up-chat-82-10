-- Ajouter la colonne streaks_required à streak_levels_config
ALTER TABLE public.streak_levels_config
ADD COLUMN IF NOT EXISTS streaks_required integer NOT NULL DEFAULT 0;

-- Migrer les données existantes : copier days_required vers streaks_required
UPDATE public.streak_levels_config
SET streaks_required = days_required
WHERE streaks_required = 0;

-- Optionnel : supprimer days_required si vous ne souhaitez plus l'utiliser
-- (commenté pour le moment, à décommenter si vous êtes sûr)
-- ALTER TABLE public.streak_levels_config DROP COLUMN IF EXISTS days_required;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_streak_levels_streaks_required 
ON public.streak_levels_config(streaks_required);