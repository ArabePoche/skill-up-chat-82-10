-- Ajouter la colonne updated_by à la table school_students_payment
ALTER TABLE school_students_payment 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_school_students_payment_updated_by 
ON school_students_payment(updated_by);

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN school_students_payment.updated_by IS 'Utilisateur qui a effectué la dernière modification du paiement';