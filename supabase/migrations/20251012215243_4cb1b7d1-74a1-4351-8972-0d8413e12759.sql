-- Ajouter un champ pour l'admin qui a confirmé une notification
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id);

-- Ajouter un champ pour tracker la dernière activité des utilisateurs
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Index pour optimiser les requêtes de présence
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen);

-- Fonction pour mettre à jour automatiquement last_seen
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET last_seen = now()
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour mettre à jour last_seen lors d'une activité de message
DROP TRIGGER IF EXISTS trigger_update_last_seen_on_message ON lesson_messages;
CREATE TRIGGER trigger_update_last_seen_on_message
AFTER INSERT ON lesson_messages
FOR EACH ROW
EXECUTE FUNCTION update_user_last_seen();