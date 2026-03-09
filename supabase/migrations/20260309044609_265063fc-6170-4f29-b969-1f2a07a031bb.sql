-- Supprimer la contrainte unique globale sur barcode
ALTER TABLE public.physical_shop_products DROP CONSTRAINT physical_shop_products_barcode_key;

-- Recréer la contrainte comme unique par boutique (shop_id + barcode)
CREATE UNIQUE INDEX physical_shop_products_barcode_shop_unique ON public.physical_shop_products (shop_id, barcode) WHERE barcode IS NOT NULL;