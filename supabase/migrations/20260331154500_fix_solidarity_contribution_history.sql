-- Fiabiliser l'historique wallet des contributions solidaires existantes et futures
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

INSERT INTO public.wallet_transactions (
  user_id,
  currency,
  amount,
  transaction_type,
  description,
  reference_id,
  reference_type,
  metadata,
  created_at
)
SELECT
  contribution.contributor_id,
  'soumboulah_cash',
  -contribution.amount,
  'spend',
  'Contribution à la cagnotte "' || campaign.title || '"',
  contribution.campaign_id::text,
  'solidarity_campaign',
  jsonb_build_object(
    'contribution_id', contribution.id,
    'campaign_title', campaign.title,
    'contribution_message', contribution.message
  ),
  contribution.created_at
FROM public.solidarity_contributions AS contribution
JOIN public.solidarity_campaigns AS campaign
  ON campaign.id = contribution.campaign_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.wallet_transactions AS transaction
  WHERE transaction.user_id = contribution.contributor_id
    AND transaction.reference_type = 'solidarity_campaign'
    AND transaction.metadata ->> 'contribution_id' = contribution.id::text
);