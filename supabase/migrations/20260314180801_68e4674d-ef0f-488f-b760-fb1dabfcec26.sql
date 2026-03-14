-- Corriger la contrainte de statut pour autoriser le workflow d'approbation admin
ALTER TABLE public.recruitment_ads
DROP CONSTRAINT IF EXISTS recruitment_ads_status_check;

ALTER TABLE public.recruitment_ads
ADD CONSTRAINT recruitment_ads_status_check
CHECK (
  status = ANY (
    ARRAY[
      'draft'::text,
      'pending_approval'::text,
      'pending_payment'::text,
      'active'::text,
      'rejected'::text,
      'expired'::text,
      'cancelled'::text
    ]
  )
);