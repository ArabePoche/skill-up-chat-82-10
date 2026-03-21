
-- ============================================
-- Table de configuration des paramètres de conversion
-- ============================================
CREATE TABLE public.currency_conversion_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habbah_per_sb integer NOT NULL DEFAULT 100,
  max_conversions_per_day integer NOT NULL DEFAULT 1,
  max_conversions_per_month integer NOT NULL DEFAULT 5,
  conversion_delay_hours integer NOT NULL DEFAULT 0,
  is_conversion_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insérer la config par défaut
INSERT INTO public.currency_conversion_settings (habbah_per_sb, max_conversions_per_day, max_conversions_per_month, conversion_delay_hours)
VALUES (100, 1, 5, 0);

-- ============================================
-- Table des règles de gain Habbah par action
-- ============================================
CREATE TABLE public.habbah_earning_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL UNIQUE,
  action_label text NOT NULL,
  habbah_amount integer NOT NULL DEFAULT 1,
  daily_limit integer NOT NULL DEFAULT 10,
  monthly_limit integer NOT NULL DEFAULT 100,
  cooldown_seconds integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Règles par défaut
INSERT INTO public.habbah_earning_rules (action_type, action_label, habbah_amount, daily_limit, monthly_limit, cooldown_seconds) VALUES
  ('like', 'Like', 1, 50, 500, 0),
  ('comment', 'Commentaire', 2, 20, 200, 30),
  ('share', 'Partage', 3, 10, 100, 60),
  ('daily_login', 'Connexion quotidienne', 5, 1, 30, 0),
  ('lesson_complete', 'Complétion de leçon', 10, 5, 50, 0),
  ('referral', 'Parrainage', 50, 3, 10, 0);

-- ============================================
-- Table des limites globales utilisateur
-- ============================================
CREATE TABLE public.currency_global_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  max_habbah_per_day integer NOT NULL DEFAULT 200,
  max_habbah_per_month integer NOT NULL DEFAULT 3000,
  min_trust_score integer NOT NULL DEFAULT 0,
  max_sb_percentage_for_digital integer NOT NULL DEFAULT 30,
  is_sb_enabled_for_digital boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

INSERT INTO public.currency_global_limits (max_habbah_per_day, max_habbah_per_month, min_trust_score, max_sb_percentage_for_digital)
VALUES (200, 3000, 0, 30);

-- ============================================
-- Table anti-fraude
-- ============================================
CREATE TABLE public.currency_antifraud_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suspicious_threshold_per_hour integer NOT NULL DEFAULT 50,
  auto_block_enabled boolean NOT NULL DEFAULT true,
  pending_validation_enabled boolean NOT NULL DEFAULT false,
  pending_validation_delay_hours integer NOT NULL DEFAULT 24,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

INSERT INTO public.currency_antifraud_settings (suspicious_threshold_per_hour, auto_block_enabled, pending_validation_enabled)
VALUES (50, true, false);

-- ============================================
-- RLS policies (admin only via profile role check)
-- ============================================
ALTER TABLE public.currency_conversion_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habbah_earning_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_global_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_antifraud_settings ENABLE ROW LEVEL SECURITY;

-- Fonction helper pour vérifier le rôle admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = user_id AND role = 'admin'
  );
$$;

-- Read policies (admin can read, authenticated can read for app logic)
CREATE POLICY "Authenticated can read conversion settings" ON public.currency_conversion_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read earning rules" ON public.habbah_earning_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read global limits" ON public.currency_global_limits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read antifraud settings" ON public.currency_antifraud_settings FOR SELECT TO authenticated USING (true);

-- Write policies (admin only)
CREATE POLICY "Admin can update conversion settings" ON public.currency_conversion_settings FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin can update earning rules" ON public.habbah_earning_rules FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin can update global limits" ON public.currency_global_limits FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin can update antifraud settings" ON public.currency_antifraud_settings FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
