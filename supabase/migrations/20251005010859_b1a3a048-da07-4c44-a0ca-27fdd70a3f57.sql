-- Ajouter une colonne pour l'indicatif téléphonique
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_country_code text;