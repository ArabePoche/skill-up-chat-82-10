
-- Table des paramètres de commission formations (dynamiques depuis l'admin)
CREATE TABLE public.formation_commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_type TEXT NOT NULL UNIQUE,
  commission_label TEXT NOT NULL,
  commission_description TEXT,
  commission_rate NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insérer les 3 types de commission par défaut
INSERT INTO public.formation_commission_settings (commission_type, commission_label, commission_description, commission_rate) VALUES
  ('catalogue', 'Via catalogue/pub plateforme', 'Commission quand les élèves s''inscrivent via nos catalogues, publicités, etc.', 35),
  ('creator_channel', 'Via canal du créateur', 'Commission quand les élèves arrivent directement dans le canal du créateur', 10),
  ('boost', 'Via boost plateforme', 'Commission quand le créateur paie pour booster sa formation sur la plateforme', 20);

-- Ajouter un champ de statut d'approbation aux formations
ALTER TABLE public.formations
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT false;

-- RLS pour formation_commission_settings
ALTER TABLE public.formation_commission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read commission settings"
  ON public.formation_commission_settings FOR SELECT
  TO public USING (true);

CREATE POLICY "Only admins can modify commission settings"
  ON public.formation_commission_settings FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
