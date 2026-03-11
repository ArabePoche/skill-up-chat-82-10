-- Migration to add status to physical_shop_sales and improve history
ALTER TABLE physical_shop_sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

-- Add index for better performance on history queries
CREATE INDEX IF NOT EXISTS idx_physical_shop_sales_shop_id ON physical_shop_sales(shop_id);
CREATE INDEX IF NOT EXISTS idx_physical_shop_sales_sold_at ON physical_shop_sales(sold_at);
