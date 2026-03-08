-- Create product_restock_subscriptions table
CREATE TABLE IF NOT EXISTS public.product_restock_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(product_id, user_id)
);

-- Enable RLS
ALTER TABLE public.product_restock_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own subscriptions"
    ON public.product_restock_subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can subscribe to restock"
    ON public.product_restock_subscriptions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsubscribe from restock"
    ON public.product_restock_subscriptions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_restock_subscriptions_product_id ON public.product_restock_subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_restock_subscriptions_user_id ON public.product_restock_subscriptions(user_id);

-- Grant permissions
GRANT ALL ON public.product_restock_subscriptions TO authenticated;
GRANT ALL ON public.product_restock_subscriptions TO service_role;
