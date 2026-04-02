-- Table de configuration des commissions marketplace
CREATE TABLE public.marketplace_commission_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_rate numeric NOT NULL DEFAULT 5,
  auto_release_days integer NOT NULL DEFAULT 7,
  min_order_amount numeric NOT NULL DEFAULT 100,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.marketplace_commission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketplace_commission_settings_select" ON public.marketplace_commission_settings
  FOR SELECT TO public USING (true);

CREATE POLICY "marketplace_commission_settings_update" ON public.marketplace_commission_settings
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
  );

INSERT INTO public.marketplace_commission_settings (commission_rate, auto_release_days, min_order_amount)
VALUES (5, 7, 100);

-- Table des commandes marketplace (escrow)
CREATE TABLE public.marketplace_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id),
  seller_id uuid NOT NULL REFERENCES auth.users(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  total_amount numeric NOT NULL,
  sc_amount numeric NOT NULL,
  commission_rate numeric NOT NULL DEFAULT 5,
  commission_amount numeric NOT NULL DEFAULT 0,
  seller_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'confirmed', 'disputed', 'refunded', 'completed')),
  payment_method text NOT NULL DEFAULT 'soumboulah_cash',
  shipping_address text,
  tracking_number text,
  buyer_confirmed_at timestamptz,
  auto_release_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketplace_orders_select" ON public.marketplace_orders
  FOR SELECT TO authenticated USING (
    buyer_id = auth.uid() OR seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "marketplace_orders_insert" ON public.marketplace_orders
  FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "marketplace_orders_update" ON public.marketplace_orders
  FOR UPDATE TO authenticated USING (
    buyer_id = auth.uid() OR seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );

-- Table des litiges
CREATE TABLE public.marketplace_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL,
  description text,
  evidence_urls text[],
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'seller_responded', 'admin_review', 'resolved_refund', 'resolved_release')),
  admin_decision text,
  admin_notes text,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketplace_disputes_select" ON public.marketplace_disputes
  FOR SELECT TO authenticated USING (
    opened_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM marketplace_orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "marketplace_disputes_insert" ON public.marketplace_disputes
  FOR INSERT TO authenticated WITH CHECK (opened_by = auth.uid());

CREATE POLICY "marketplace_disputes_update" ON public.marketplace_disputes
  FOR UPDATE TO authenticated USING (
    opened_by = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );