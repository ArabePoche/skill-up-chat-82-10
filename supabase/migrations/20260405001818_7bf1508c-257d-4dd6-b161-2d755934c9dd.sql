
-- Supprimer définitivement la contrainte CHECK sur transaction_type
-- qui bloque les types gift_sent, gift_received, commission, etc.
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_transaction_type_check;
