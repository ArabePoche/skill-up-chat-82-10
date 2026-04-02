-- Journal d'activités (Audit Trail) pour les boutiques physiques
CREATE TABLE IF NOT EXISTS public.shop_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.physical_shops(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.shop_agents(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour accélérer la recherche du journal par date descendante
CREATE INDEX IF NOT EXISTS idx_shop_activity_logs_shop_created_at ON public.shop_activity_logs(shop_id, created_at DESC);

-- Ajouter RLS 
ALTER TABLE public.shop_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activité visible pour les agents de la boutique" ON public.shop_activity_logs
    FOR SELECT
    USING (
        shop_id IN (
            SELECT shop_id FROM public.shop_agents WHERE id = auth.uid()
            UNION
            SELECT id FROM public.physical_shops WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Activité modifiable par le système" ON public.shop_activity_logs
    FOR INSERT
    WITH CHECK (
        shop_id IN (
            SELECT shop_id FROM public.shop_agents WHERE id = auth.uid()
            UNION
            SELECT id FROM public.physical_shops WHERE owner_id = auth.uid()
        )
    );