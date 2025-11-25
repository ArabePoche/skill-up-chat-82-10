-- Ajouter le champ registration_fee à la table classes
ALTER TABLE classes 
ADD COLUMN registration_fee DECIMAL(10,2) DEFAULT NULL;

COMMENT ON COLUMN classes.registration_fee IS 'Frais d''inscription (optionnel, peut être payé plus tard)';
COMMENT ON COLUMN classes.annual_fee IS 'Frais de scolarité annuels';