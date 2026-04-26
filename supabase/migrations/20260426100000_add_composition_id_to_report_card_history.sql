-- Ajouter le champ composition_id à la table school_report_card_history
-- Permet de lier l'historique des bulletins aux compositions/examens

-- Ajouter le champ composition_id (optionnel pour compatibilité)
ALTER TABLE public.school_report_card_history
ADD COLUMN IF NOT EXISTS composition_id UUID REFERENCES public.school_compositions(id) ON DELETE SET NULL;

-- Rendre grading_period_id optionnel pour permettre les bulletins basés sur compositions
ALTER TABLE public.school_report_card_history
ALTER COLUMN grading_period_id DROP NOT NULL;

-- Ajouter un commentaire
COMMENT ON COLUMN public.school_report_card_history.composition_id IS 'Référence à la composition/examen ayant servi à générer le bulletin (alternative à grading_period_id)';
