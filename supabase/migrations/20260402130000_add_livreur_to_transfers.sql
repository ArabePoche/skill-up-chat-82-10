-- Ajouter le nom du livreur sur les transferts
ALTER TABLE IF EXISTS public.shop_stock_transfers
ADD COLUMN IF NOT EXISTS delivered_by TEXT;