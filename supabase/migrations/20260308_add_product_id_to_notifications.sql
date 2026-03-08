-- Add product_id to notifications table if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'product_id') THEN
        ALTER TABLE public.notifications ADD COLUMN product_id UUID REFERENCES public.products(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_product_id ON public.notifications(product_id);

-- Ensure authenticated users can read notifications with this column
-- (Policies usually apply to the whole row, but just in case)
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
