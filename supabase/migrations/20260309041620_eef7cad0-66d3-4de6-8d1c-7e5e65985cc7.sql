CREATE TABLE IF NOT EXISTS public.shop_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_shop_id UUID NOT NULL REFERENCES public.physical_shops(id) ON DELETE CASCADE,
    receiver_shop_id UUID NOT NULL REFERENCES public.physical_shops(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    transfer_id UUID REFERENCES public.shop_stock_transfers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL
);

ALTER TABLE public.shop_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read messages related to their shops"
    ON public.shop_messages FOR SELECT
    USING (
        sender_shop_id IN (SELECT id FROM public.physical_shops WHERE owner_id = auth.uid()) OR
        receiver_shop_id IN (SELECT id FROM public.physical_shops WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can send messages from their shops"
    ON public.shop_messages FOR INSERT
    WITH CHECK (
        sender_shop_id IN (SELECT id FROM public.physical_shops WHERE owner_id = auth.uid()) AND
        sender_id = auth.uid()
    );

CREATE POLICY "Users can mark messages as read for their shops"
    ON public.shop_messages FOR UPDATE
    USING (
        receiver_shop_id IN (SELECT id FROM public.physical_shops WHERE owner_id = auth.uid())
    );

-- Create a realtime publication for the shop_messages table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'shop_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE shop_messages;
    END IF;
END $$;
