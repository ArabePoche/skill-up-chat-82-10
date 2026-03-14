
-- Table pour les annonces de recrutement payantes
CREATE TABLE public.recruitment_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shop_id UUID REFERENCES public.physical_shops(id) ON DELETE SET NULL,
  
  -- Contenu de l'annonce
  title TEXT NOT NULL,
  description TEXT,
  skills TEXT[] DEFAULT '{}',
  location TEXT,
  salary_range TEXT,
  contract_type TEXT DEFAULT 'CDI',
  experience_level TEXT DEFAULT 'junior',
  media_urls TEXT[] DEFAULT '{}',
  
  -- Publication
  publish_type TEXT NOT NULL DEFAULT 'post' CHECK (publish_type IN ('post', 'status')),
  budget INTEGER NOT NULL DEFAULT 0,
  estimated_reach INTEGER NOT NULL DEFAULT 0,
  
  -- État
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_payment', 'active', 'expired', 'cancelled')),
  is_active BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour performances
CREATE INDEX idx_recruitment_ads_owner ON public.recruitment_ads(owner_id);
CREATE INDEX idx_recruitment_ads_status ON public.recruitment_ads(status);
CREATE INDEX idx_recruitment_ads_active ON public.recruitment_ads(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.recruitment_ads ENABLE ROW LEVEL SECURITY;

-- Le propriétaire peut tout faire sur ses annonces
CREATE POLICY "Owners can manage their ads"
ON public.recruitment_ads
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Les annonces actives sont visibles par tous les utilisateurs connectés
CREATE POLICY "Active ads are visible to all authenticated"
ON public.recruitment_ads
FOR SELECT
TO authenticated
USING (is_active = true AND status = 'active');
