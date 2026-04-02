-- Migration pour ajouter un numéro de facture (receipt_id) aux ventes de boutique physiques
ALTER TABLE public.physical_shop_sales ADD COLUMN IF NOT EXISTS receipt_id TEXT;
CREATE INDEX IF NOT EXISTS idx_physical_shop_sales_receipt_id ON public.physical_shop_sales(receipt_id);
