-- Ajouter les colonnes pour le tracking automatique des sessions
ALTER TABLE user_streaks
ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN last_logout_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN daily_minutes INTEGER NOT NULL DEFAULT 0;

-- Ajouter un index pour améliorer les performances des requêtes
CREATE INDEX idx_user_streaks_last_activity ON user_streaks(last_activity_date);
CREATE INDEX idx_user_streaks_user_id ON user_streaks(user_id);

-- Commentaires pour la documentation
COMMENT ON COLUMN user_streaks.last_login_at IS 'Dernière heure de connexion de l''utilisateur';
COMMENT ON COLUMN user_streaks.last_logout_at IS 'Dernière heure de déconnexion de l''utilisateur';
COMMENT ON COLUMN user_streaks.daily_minutes IS 'Total des minutes utilisées aujourd''hui (réinitialisé chaque jour)';