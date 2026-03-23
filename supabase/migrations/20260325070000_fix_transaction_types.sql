-- Update wallet_transactions constraint to allow gift_sent and gift_received
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_transaction_type_check;

ALTER TABLE public.wallet_transactions 
  ADD CONSTRAINT wallet_transactions_transaction_type_check 
  CHECK (transaction_type IN ('earn', 'spend', 'convert', 'gift', 'refund', 'purchase', 'topup', 'gift_sent', 'gift_received'));
