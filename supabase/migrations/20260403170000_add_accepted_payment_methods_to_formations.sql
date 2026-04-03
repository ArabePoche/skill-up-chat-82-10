-- Ajouter la colonne accepted_payment_methods à la table formations
-- Permet de configurer quelles méthodes de paiement via portefeuille (SC, SB) sont acceptées pour chaque formation

ALTER TABLE public.formations
  ADD COLUMN IF NOT EXISTS accepted_payment_methods text[] DEFAULT '{}';

COMMENT ON COLUMN public.formations.accepted_payment_methods IS
  'Liste des méthodes de paiement via portefeuille acceptées (ex: soumboulah_cash, soumboulah_bonus)';
