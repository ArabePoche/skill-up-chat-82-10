-- 1. Ajouter le prix d'achat aux produits
ALTER TABLE public.physical_shop_products 
  ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;

-- 2. Ajouter le cost_price aux ventes
ALTER TABLE public.physical_shop_sales
  ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;

-- 3. Table des clients de boutique
CREATE TABLE IF NOT EXISTS public.shop_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.physical_shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  notes text,
  total_spent numeric DEFAULT 0,
  total_purchases integer DEFAULT 0,
  loyalty_points integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Table de crédit / dettes clients
CREATE TABLE IF NOT EXISTS public.shop_customer_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.shop_customers(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.physical_shops(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES public.physical_shop_sales(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('credit', 'payment')),
  description text,
  created_at timestamptz DEFAULT now()
);

-- 5. Ajouter customer_id aux ventes (après création de la table)
ALTER TABLE public.physical_shop_sales
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.shop_customers(id) ON DELETE SET NULL;

-- 6. RLS
ALTER TABLE public.shop_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_customer_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners can manage customers" ON public.shop_customers
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.physical_shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.physical_shops WHERE owner_id = auth.uid()));

CREATE POLICY "Shop owners can manage credits" ON public.shop_customer_credits
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.physical_shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.physical_shops WHERE owner_id = auth.uid()));