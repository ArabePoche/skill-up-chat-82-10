
-- Table des fournisseurs
CREATE TABLE public.shop_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.physical_shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des commandes fournisseurs
CREATE TABLE public.supplier_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.physical_shops(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.shop_suppliers(id) ON DELETE CASCADE,
    order_number TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    total_amount NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    ordered_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des lignes de commande fournisseur
CREATE TABLE public.supplier_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.supplier_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.physical_shop_products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    received_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.shop_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_order_items ENABLE ROW LEVEL SECURITY;

-- Fonction helper pour vérifier l'accès à une boutique
CREATE OR REPLACE FUNCTION public.has_shop_access(_user_id UUID, _shop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.physical_shops WHERE id = _shop_id AND owner_id = _user_id
    ) OR EXISTS (
        SELECT 1 FROM public.shop_agents WHERE shop_id = _shop_id AND user_id = _user_id AND status = 'active'
    )
$$;

-- RLS shop_suppliers
CREATE POLICY "Users can view suppliers of their shops"
ON public.shop_suppliers FOR SELECT TO authenticated
USING (public.has_shop_access(auth.uid(), shop_id));

CREATE POLICY "Users can insert suppliers in their shops"
ON public.shop_suppliers FOR INSERT TO authenticated
WITH CHECK (public.has_shop_access(auth.uid(), shop_id));

CREATE POLICY "Users can update suppliers in their shops"
ON public.shop_suppliers FOR UPDATE TO authenticated
USING (public.has_shop_access(auth.uid(), shop_id))
WITH CHECK (public.has_shop_access(auth.uid(), shop_id));

CREATE POLICY "Users can delete suppliers in their shops"
ON public.shop_suppliers FOR DELETE TO authenticated
USING (public.has_shop_access(auth.uid(), shop_id));

-- RLS supplier_orders
CREATE POLICY "Users can view supplier orders of their shops"
ON public.supplier_orders FOR SELECT TO authenticated
USING (public.has_shop_access(auth.uid(), shop_id));

CREATE POLICY "Users can insert supplier orders in their shops"
ON public.supplier_orders FOR INSERT TO authenticated
WITH CHECK (public.has_shop_access(auth.uid(), shop_id));

CREATE POLICY "Users can update supplier orders in their shops"
ON public.supplier_orders FOR UPDATE TO authenticated
USING (public.has_shop_access(auth.uid(), shop_id))
WITH CHECK (public.has_shop_access(auth.uid(), shop_id));

CREATE POLICY "Users can delete supplier orders in their shops"
ON public.supplier_orders FOR DELETE TO authenticated
USING (public.has_shop_access(auth.uid(), shop_id));

-- RLS supplier_order_items (via order → shop)
CREATE POLICY "Users can view supplier order items"
ON public.supplier_order_items FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.supplier_orders o
    WHERE o.id = order_id AND public.has_shop_access(auth.uid(), o.shop_id)
));

CREATE POLICY "Users can insert supplier order items"
ON public.supplier_order_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM public.supplier_orders o
    WHERE o.id = order_id AND public.has_shop_access(auth.uid(), o.shop_id)
));

CREATE POLICY "Users can update supplier order items"
ON public.supplier_order_items FOR UPDATE TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.supplier_orders o
    WHERE o.id = order_id AND public.has_shop_access(auth.uid(), o.shop_id)
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.supplier_orders o
    WHERE o.id = order_id AND public.has_shop_access(auth.uid(), o.shop_id)
));

CREATE POLICY "Users can delete supplier order items"
ON public.supplier_order_items FOR DELETE TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.supplier_orders o
    WHERE o.id = order_id AND public.has_shop_access(auth.uid(), o.shop_id)
));
