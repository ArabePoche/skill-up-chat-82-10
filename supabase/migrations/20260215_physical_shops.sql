-- Physical shops owned by users
CREATE TABLE IF NOT EXISTS physical_shops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Products in physical shops with stock tracking
CREATE TABLE IF NOT EXISTS physical_shop_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES physical_shops(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0,
  stock_quantity INT DEFAULT 0,
  marketplace_quantity INT DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add shop owner flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_shop_owner BOOLEAN DEFAULT false;

-- RLS policies
ALTER TABLE physical_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_shop_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shops"
  ON physical_shops FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own shops"
  ON physical_shops FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own shops"
  ON physical_shops FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own shops"
  ON physical_shops FOR DELETE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can view their shop products"
  ON physical_shop_products FOR SELECT
  USING (
    shop_id IN (SELECT id FROM physical_shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can manage their shop products"
  ON physical_shop_products FOR INSERT
  WITH CHECK (
    shop_id IN (SELECT id FROM physical_shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can update their shop products"
  ON physical_shop_products FOR UPDATE
  USING (
    shop_id IN (SELECT id FROM physical_shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can delete their shop products"
  ON physical_shop_products FOR DELETE
  USING (
    shop_id IN (SELECT id FROM physical_shops WHERE owner_id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_physical_shops_owner ON physical_shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_physical_shop_products_shop ON physical_shop_products(shop_id);
CREATE INDEX IF NOT EXISTS idx_physical_shop_products_product ON physical_shop_products(product_id);
