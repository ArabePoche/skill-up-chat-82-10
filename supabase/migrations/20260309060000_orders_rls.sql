ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can create their own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Sellers can view their orders"
ON public.orders
FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

CREATE POLICY "Sellers can update their orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can view items of their orders"
ON public.order_items
FOR SELECT
TO authenticated
USING (order_id IN (SELECT id FROM public.orders WHERE seller_id = auth.uid()));

CREATE POLICY "Buyers can insert items for their orders"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

CREATE POLICY "Sellers can view their products"
ON public.products
FOR SELECT
TO authenticated
USING (seller_id = auth.uid());
