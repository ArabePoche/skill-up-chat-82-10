
-- Add category and location columns to physical_shop_products
ALTER TABLE public.physical_shop_products 
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS location TEXT DEFAULT NULL;

-- Create index for filtering by category
CREATE INDEX IF NOT EXISTS idx_physical_shop_products_category 
  ON public.physical_shop_products(shop_id, category);
