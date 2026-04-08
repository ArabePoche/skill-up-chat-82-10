
-- 1. Table des paiements live avec escrow
CREATE TABLE public.live_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id),
  creator_id UUID NOT NULL REFERENCES public.profiles(id),
  live_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  creator_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SC',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','released','refunded','disputed')),
  release_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  disputed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_buyer_live UNIQUE (buyer_id, live_id)
);

ALTER TABLE public.live_payments ENABLE ROW LEVEL SECURITY;

-- Acheteur voit ses paiements
CREATE POLICY "Buyers see own payments" ON public.live_payments
  FOR SELECT USING (auth.uid() = buyer_id);

-- Créateur voit les paiements de ses lives
CREATE POLICY "Creators see their live payments" ON public.live_payments
  FOR SELECT USING (auth.uid() = creator_id);

-- Admins voient tout
CREATE POLICY "Admins see all payments" ON public.live_payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Insertion uniquement via edge function (service_role), pas de politique INSERT pour anon/authenticated
-- Les updates sont gérées par edge function aussi

-- 2. Table des réclamations
CREATE TABLE public.live_payment_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.live_payments(id),
  claimant_id UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','approved','rejected')),
  resolution TEXT CHECK (resolution IN ('refund','release')),
  resolved_by UUID REFERENCES public.profiles(id),
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_payment_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Claimants see own disputes" ON public.live_payment_disputes
  FOR SELECT USING (auth.uid() = claimant_id);

CREATE POLICY "Creators see disputes on their payments" ON public.live_payment_disputes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.live_payments WHERE id = payment_id AND creator_id = auth.uid())
  );

CREATE POLICY "Admins see all disputes" ON public.live_payment_disputes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. Commission settings
CREATE TABLE public.live_commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10,
  commission_label TEXT NOT NULL DEFAULT 'Commission Live',
  commission_description TEXT DEFAULT 'Commission prélevée sur les lives payants',
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.live_commission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read live commission settings" ON public.live_commission_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins update live commission settings" ON public.live_commission_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Insert default row
INSERT INTO public.live_commission_settings (commission_rate, commission_label, commission_description)
VALUES (10, 'Commission Live', 'Commission plateforme sur les lives payants (%)');

-- 4. Fraud limits settings
CREATE TABLE public.live_fraud_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  max_disputes_per_month INTEGER NOT NULL DEFAULT 3,
  auto_block_threshold INTEGER NOT NULL DEFAULT 5,
  escrow_duration_hours INTEGER NOT NULL DEFAULT 24,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.live_fraud_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read fraud limits" ON public.live_fraud_limits
  FOR SELECT USING (true);

CREATE POLICY "Admins update fraud limits" ON public.live_fraud_limits
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Insert default row
INSERT INTO public.live_fraud_limits (max_disputes_per_month, auto_block_threshold, escrow_duration_hours)
VALUES (3, 5, 24);

-- 5. Index pour performance
CREATE INDEX idx_live_payments_buyer ON public.live_payments(buyer_id);
CREATE INDEX idx_live_payments_creator ON public.live_payments(creator_id);
CREATE INDEX idx_live_payments_live ON public.live_payments(live_id);
CREATE INDEX idx_live_payments_status ON public.live_payments(status);
CREATE INDEX idx_live_payments_release_at ON public.live_payments(release_at) WHERE status = 'pending';
CREATE INDEX idx_live_disputes_payment ON public.live_payment_disputes(payment_id);
CREATE INDEX idx_live_disputes_claimant ON public.live_payment_disputes(claimant_id);

-- 6. Trigger updated_at
CREATE TRIGGER update_live_payments_updated_at
  BEFORE UPDATE ON public.live_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_live_disputes_updated_at
  BEFORE UPDATE ON public.live_payment_disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
