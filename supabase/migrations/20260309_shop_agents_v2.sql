
-- 1. Table des agents de boutique
CREATE TABLE IF NOT EXISTS public.shop_agents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id uuid NOT NULL REFERENCES public.physical_shops(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Lien optionnel vers un compte global
    first_name text NOT NULL,
    last_name text NOT NULL,
    role text NOT NULL CHECK (role IN ('PDG', 'comptable', 'vendeur')),
    pin_code text, -- Code d'accès local (optionnel)
    status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Ajouter agent_id aux ventes
ALTER TABLE public.physical_shop_sales
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.shop_agents(id) ON DELETE SET NULL;

-- 3. RLS pour shop_agents
ALTER TABLE public.shop_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners can manage agents" ON public.shop_agents
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.physical_shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.physical_shops WHERE owner_id = auth.uid()));

CREATE POLICY "Agents can view their colleagues" ON public.shop_agents
  FOR SELECT TO authenticated
  USING (shop_id IN (SELECT shop_id FROM public.shop_agents WHERE user_id = auth.uid()));

-- 4. Fonctions helper pour vérifier les accès agents
CREATE OR REPLACE FUNCTION public.is_shop_agent(p_shop_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.shop_agents 
    WHERE shop_id = p_shop_id AND user_id = p_user_id AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.physical_shops
    WHERE id = p_shop_id AND owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Mise à jour des politiques RLS pour les autres tables boutique
-- Note: On utilise des fonctions ou des subqueries pour inclure les agents

-- Physical Shop Products
DROP POLICY IF EXISTS "Users can view their shop products" ON public.physical_shop_products;
CREATE POLICY "Agents can view shop products" ON public.physical_shop_products
  FOR SELECT TO authenticated
  USING (public.is_shop_agent(shop_id, auth.uid()));

DROP POLICY IF EXISTS "Users can manage their shop products" ON public.physical_shop_products;
CREATE POLICY "Agents can manage shop products" ON public.physical_shop_products
  FOR ALL TO authenticated
  USING (public.is_shop_agent(shop_id, auth.uid()));

-- Physical Shop Sales
DROP POLICY IF EXISTS "Users can view their sales" ON public.physical_shop_sales; -- Si elle existe
CREATE POLICY "Agents can manage shop sales" ON public.physical_shop_sales
  FOR ALL TO authenticated
  USING (public.is_shop_agent(shop_id, auth.uid()));

-- Shop Customers
DROP POLICY IF EXISTS "Shop owners can manage customers" ON public.shop_customers;
CREATE POLICY "Agents can manage customers" ON public.shop_customers
  FOR ALL TO authenticated
  USING (public.is_shop_agent(shop_id, auth.uid()));

-- 6. Initialisation : Ajouter les propriétaires actuels comme PDG dans shop_agents
INSERT INTO public.shop_agents (shop_id, user_id, first_name, last_name, role)
SELECT 
    s.id as shop_id, 
    s.owner_id as user_id, 
    COALESCE(p.first_name, 'Propriétaire'), 
    COALESCE(p.last_name, ''), 
    'PDG'
FROM public.physical_shops s
LEFT JOIN public.profiles p ON s.owner_id = p.id
ON CONFLICT DO NOTHING;
