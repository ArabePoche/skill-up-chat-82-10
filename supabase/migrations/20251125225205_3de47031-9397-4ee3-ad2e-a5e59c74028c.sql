-- Ajouter un champ pour suivre le montant payé du frais d'inscription
ALTER TABLE school_student_payment_progress
ADD COLUMN IF NOT EXISTS registration_fee_paid_amount numeric DEFAULT 0;

-- Mettre à jour le commentaire de la table pour clarifier
COMMENT ON COLUMN school_student_payment_progress.registration_fee_paid_amount IS 'Montant payé du frais d''inscription (séparé des paiements scolaires)';
COMMENT ON COLUMN school_student_payment_progress.total_amount_paid IS 'Montant total payé pour les frais scolaires uniquement (n''inclut PAS le frais d''inscription)';
COMMENT ON COLUMN school_student_payment_progress.total_amount_due IS 'Montant total dû pour les frais scolaires uniquement (n''inclut PAS le frais d''inscription)';