-- Table de configuration des niveaux de streak (gérée par les admins)
CREATE TABLE IF NOT EXISTS public.streak_levels_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number INTEGER NOT NULL UNIQUE,
  level_name TEXT NOT NULL,
  level_badge TEXT NOT NULL, -- emoji ou icon du badge
  days_required INTEGER NOT NULL, -- nombre de jours consécutifs requis
  level_color TEXT NOT NULL DEFAULT '#3b82f6', -- couleur du niveau
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table de configuration globale pour le streak
CREATE TABLE IF NOT EXISTS public.streak_global_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  minutes_per_day_required INTEGER NOT NULL DEFAULT 10, -- minutes quotidiennes pour valider un streak
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table de suivi des streaks des utilisateurs
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0, -- streak actuel
  longest_streak INTEGER NOT NULL DEFAULT 0, -- meilleur streak
  total_days_active INTEGER NOT NULL DEFAULT 0, -- total de jours actifs
  current_level INTEGER NOT NULL DEFAULT 0, -- niveau actuel
  last_activity_date DATE, -- dernière date d'activité
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS Policies pour streak_levels_config
ALTER TABLE public.streak_levels_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tous peuvent voir les niveaux"
  ON public.streak_levels_config
  FOR SELECT
  USING (true);

CREATE POLICY "Seuls les admins peuvent créer des niveaux"
  ON public.streak_levels_config
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Seuls les admins peuvent modifier des niveaux"
  ON public.streak_levels_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Seuls les admins peuvent supprimer des niveaux"
  ON public.streak_levels_config
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies pour streak_global_config
ALTER TABLE public.streak_global_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tous peuvent voir la config globale"
  ON public.streak_global_config
  FOR SELECT
  USING (true);

CREATE POLICY "Seuls les admins peuvent créer la config globale"
  ON public.streak_global_config
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Seuls les admins peuvent modifier la config globale"
  ON public.streak_global_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies pour user_streaks
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs peuvent voir leur propre streak"
  ON public.user_streaks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent voir les streaks des autres"
  ON public.user_streaks
  FOR SELECT
  USING (true);

CREATE POLICY "Les utilisateurs peuvent créer leur propre streak"
  ON public.user_streaks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent mettre à jour leur propre streak"
  ON public.user_streaks
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Les admins peuvent voir tous les streaks"
  ON public.user_streaks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Fonction pour mettre à jour le niveau d'un utilisateur
CREATE OR REPLACE FUNCTION public.update_user_level()
RETURNS TRIGGER AS $$
DECLARE
  new_level INTEGER;
BEGIN
  -- Trouver le niveau approprié en fonction du current_streak
  SELECT COALESCE(MAX(level_number), 0)
  INTO new_level
  FROM streak_levels_config
  WHERE days_required <= NEW.current_streak
  ORDER BY days_required DESC
  LIMIT 1;
  
  NEW.current_level := new_level;
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour mettre à jour automatiquement le niveau
CREATE TRIGGER update_user_level_trigger
  BEFORE INSERT OR UPDATE OF current_streak
  ON public.user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_level();

-- Fonction pour mettre à jour les timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour mettre à jour updated_at
CREATE TRIGGER update_streak_levels_config_updated_at
  BEFORE UPDATE ON public.streak_levels_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_streak_global_config_updated_at
  BEFORE UPDATE ON public.streak_global_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer une configuration globale par défaut
INSERT INTO public.streak_global_config (minutes_per_day_required)
VALUES (10)
ON CONFLICT DO NOTHING;

-- Insérer des niveaux par défaut
INSERT INTO public.streak_levels_config (level_number, level_name, level_badge, days_required, level_color)
VALUES 
  (1, 'Bronze', '🥉', 3, '#10b981'),
  (2, 'Silver', '🥈', 7, '#3b82f6'),
  (3, 'Gold', '🥇', 14, '#f59e0b'),
  (4, 'Diamond', ' 💎 ', 30, '#8b5cf6'),
ON CONFLICT (level_number) DO NOTHING;