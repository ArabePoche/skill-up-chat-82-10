-- Table pour l'historique des mouvements de stock (inventaire)
CREATE TABLE public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.physical_shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.physical_shop_products(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'sale', 'return', 'transfer_out', 'transfer_in')),
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reason TEXT,
    reference_id UUID, -- Peut référencer une vente, un transfert, etc.
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_inventory_movements_shop_id ON public.inventory_movements(shop_id);
CREATE INDEX idx_inventory_movements_product_id ON public.inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_created_at ON public.inventory_movements(created_at DESC);

-- RLS policies
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Les propriétaires peuvent voir leurs mouvements
CREATE POLICY "Owners can view their inventory movements"
ON public.inventory_movements
FOR SELECT
TO authenticated
USING (
    shop_id IN (
        SELECT id FROM public.physical_shops WHERE owner_id = auth.uid()
    )
);

-- Les propriétaires peuvent insérer des mouvements
CREATE POLICY "Owners can insert inventory movements"
ON public.inventory_movements
FOR INSERT
TO authenticated
WITH CHECK (
    shop_id IN (
        SELECT id FROM public.physical_shops WHERE owner_id = auth.uid()
    )
);