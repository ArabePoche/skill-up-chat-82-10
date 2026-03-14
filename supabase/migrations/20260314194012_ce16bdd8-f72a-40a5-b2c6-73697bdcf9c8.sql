
-- 1. Add ad_type and product_id to recruitment_ads for product/service ads
ALTER TABLE public.recruitment_ads 
  ADD COLUMN IF NOT EXISTS ad_type text NOT NULL DEFAULT 'recruitment',
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.physical_shop_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS product_price numeric,
  ADD COLUMN IF NOT EXISTS service_description text;

-- 2. Add boost fields to posts table
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_boosted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS boost_budget integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boost_estimated_reach integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boost_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS boost_status text DEFAULT 'none';
