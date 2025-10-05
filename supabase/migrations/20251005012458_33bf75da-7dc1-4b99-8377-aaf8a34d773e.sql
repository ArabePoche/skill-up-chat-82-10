-- Créer un index unique sur la combinaison phone_country_code + phone
-- Cela empêchera les nouveaux doublons sans toucher aux existants
CREATE UNIQUE INDEX IF NOT EXISTS unique_phone_per_country 
ON profiles (phone_country_code, phone) 
WHERE phone IS NOT NULL AND phone != '';