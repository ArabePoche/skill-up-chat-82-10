
-- Table des cagnottes solidaires
CREATE TABLE public.solidarity_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  goal_amount NUMERIC NOT NULL DEFAULT 0,
  collected_amount NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'closed')),
  rejection_reason TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  category TEXT DEFAULT 'general',
  beneficiary_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des contributions
CREATE TABLE public.solidarity_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.solidarity_campaigns(id) ON DELETE CASCADE NOT NULL,
  contributor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Configuration des commissions de solidarité
CREATE TABLE public.solidarity_commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_commission_rate NUMERIC NOT NULL DEFAULT 5,
  min_campaign_goal NUMERIC NOT NULL DEFAULT 1000,
  max_campaign_goal NUMERIC NOT NULL DEFAULT 10000000,
  max_active_campaigns_per_user INT NOT NULL DEFAULT 3,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Config par défaut
INSERT INTO public.solidarity_commission_settings (default_commission_rate, min_campaign_goal, max_campaign_goal, max_active_campaigns_per_user)
VALUES (5, 1000, 10000000, 3);

-- RLS
ALTER TABLE public.solidarity_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solidarity_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solidarity_commission_settings ENABLE ROW LEVEL SECURITY;

-- Campaigns policies
CREATE POLICY "Anyone can view approved campaigns" ON public.solidarity_campaigns
  FOR SELECT USING (status = 'approved' OR status = 'completed' OR creator_id = auth.uid());

CREATE POLICY "Authenticated users can create campaigns" ON public.solidarity_campaigns
  FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creator can update own pending campaigns" ON public.solidarity_campaigns
  FOR UPDATE TO authenticated USING (creator_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admin can update all campaigns" ON public.solidarity_campaigns
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Contributions policies
CREATE POLICY "Anyone can view contributions" ON public.solidarity_contributions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can contribute" ON public.solidarity_contributions
  FOR INSERT TO authenticated WITH CHECK (contributor_id = auth.uid());

-- Commission settings policies
CREATE POLICY "Anyone can read commission settings" ON public.solidarity_commission_settings
  FOR SELECT USING (true);

CREATE POLICY "Admin can update commission settings" ON public.solidarity_commission_settings
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
