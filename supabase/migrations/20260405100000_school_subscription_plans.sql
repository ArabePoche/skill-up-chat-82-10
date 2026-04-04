-- Abonnements école : plans (free → premium), fonctionnalités activables, prix
-- Admin configure plans + matrice fonctionnalités ; attribution par école

CREATE TABLE IF NOT EXISTS public.school_subscription_features (
  feature_key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.school_subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_monthly numeric(14, 2) NOT NULL DEFAULT 0,
  price_yearly numeric(14, 2),
  currency text NOT NULL DEFAULT 'XOF',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_plan_features (
  plan_id uuid NOT NULL REFERENCES public.school_subscription_plans(id) ON DELETE CASCADE,
  feature_key text NOT NULL REFERENCES public.school_subscription_features(feature_key) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  PRIMARY KEY (plan_id, feature_key)
);

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS subscription_plan_id uuid REFERENCES public.school_subscription_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_schools_subscription_plan_id ON public.schools(subscription_plan_id);

-- Plans stables (référence pour trigger & données initiales)
INSERT INTO public.school_subscription_plans (id, slug, name, description, price_monthly, price_yearly, currency, sort_order)
VALUES
  ('a0000001-0000-4000-8000-000000000001', 'free', 'Gratuit', 'Découverte et démarrage', 0, 0, 'XOF', 0),
  ('a0000001-0000-4000-8000-000000000002', 'standard', 'Standard', 'Écoles en croissance', 15000, 150000, 'XOF', 1),
  ('a0000001-0000-4000-8000-000000000003', 'premium', 'Premium', 'Fonctionnalités avancées', 45000, 450000, 'XOF', 2)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.school_subscription_features (feature_key, label, description, category, sort_order) VALUES
  ('public_school_site', 'Site public de l''école', 'Page vitrine /school-site', 'visibilite', 10),
  ('school_os_full', 'School-OS complet', 'Accès à tous les modules de gestion', 'core', 20),
  ('advanced_reports', 'Rapports avancés', 'Statistiques et exports étendus', 'pedagogie', 30),
  ('digital_bulletins', 'Bulletins numériques', 'Génération et suivi des bulletins', 'pedagogie', 40),
  ('parent_portal', 'Portail parents', 'Espace parents enrichi', 'communication', 50),
  ('multi_branch', 'Multi-antennes', 'Plusieurs sites / établissements', 'structure', 60),
  ('staff_unlimited', 'Personnel illimité', 'Pas de limite sur le nombre de comptes staff', 'structure', 70),
  ('students_high_cap', 'Limite élèves étendue', 'Plafond élèves relevé (ex. 500+)', 'structure', 80),
  ('api_integrations', 'API & intégrations', 'Webhooks et exports automatisés', 'tech', 90),
  ('priority_support', 'Support prioritaire', 'Assistance dédiée', 'support', 100)
ON CONFLICT (feature_key) DO NOTHING;

-- Matrice par défaut : free minimal, standard milieu, premium tout
INSERT INTO public.school_plan_features (plan_id, feature_key, enabled)
SELECT 'a0000001-0000-4000-8000-000000000001', f.feature_key,
  CASE f.feature_key
    WHEN 'public_school_site' THEN true
    WHEN 'school_os_full' THEN true
    ELSE false
  END
FROM public.school_subscription_features f
ON CONFLICT (plan_id, feature_key) DO NOTHING;

INSERT INTO public.school_plan_features (plan_id, feature_key, enabled)
SELECT 'a0000001-0000-4000-8000-000000000002', f.feature_key,
  CASE f.feature_key
    WHEN 'api_integrations' THEN false
    WHEN 'priority_support' THEN false
    ELSE true
  END
FROM public.school_subscription_features f
ON CONFLICT (plan_id, feature_key) DO NOTHING;

INSERT INTO public.school_plan_features (plan_id, feature_key, enabled)
SELECT 'a0000001-0000-4000-8000-000000000003', f.feature_key, true
FROM public.school_subscription_features f
ON CONFLICT (plan_id, feature_key) DO NOTHING;

UPDATE public.schools
SET subscription_plan_id = 'a0000001-0000-4000-8000-000000000001'
WHERE subscription_plan_id IS NULL;

CREATE OR REPLACE FUNCTION public.set_school_default_subscription_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.subscription_plan_id IS NULL THEN
    NEW.subscription_plan_id := 'a0000001-0000-4000-8000-000000000001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_schools_default_subscription_plan ON public.schools;
CREATE TRIGGER trg_schools_default_subscription_plan
  BEFORE INSERT ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.set_school_default_subscription_plan();

CREATE OR REPLACE FUNCTION public.prevent_school_subscription_change_by_non_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.subscription_plan_id IS DISTINCT FROM OLD.subscription_plan_id
        OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at) THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ) THEN
        RAISE EXCEPTION 'Seuls les administrateurs peuvent modifier l''abonnement de l''école';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_schools_protect_subscription ON public.schools;
CREATE TRIGGER trg_schools_protect_subscription
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_school_subscription_change_by_non_admin();

CREATE OR REPLACE FUNCTION public.touch_school_subscription_plan_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_school_subscription_plans_updated_at ON public.school_subscription_plans;
CREATE TRIGGER trg_school_subscription_plans_updated_at
  BEFORE UPDATE ON public.school_subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_school_subscription_plan_updated_at();

-- RLS
ALTER TABLE public.school_subscription_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_plan_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_sub_features_select_auth" ON public.school_subscription_features;
DROP POLICY IF EXISTS "school_sub_features_admin_all" ON public.school_subscription_features;
DROP POLICY IF EXISTS "school_sub_plans_select_auth" ON public.school_subscription_plans;
DROP POLICY IF EXISTS "school_sub_plans_admin_write" ON public.school_subscription_plans;
DROP POLICY IF EXISTS "school_sub_plans_admin_update" ON public.school_subscription_plans;
DROP POLICY IF EXISTS "school_sub_plans_admin_delete" ON public.school_subscription_plans;
DROP POLICY IF EXISTS "school_plan_features_select_auth" ON public.school_plan_features;
DROP POLICY IF EXISTS "school_plan_features_admin_all" ON public.school_plan_features;
DROP POLICY IF EXISTS "schools_select_admin_all" ON public.schools;

CREATE POLICY "school_sub_features_select_auth"
  ON public.school_subscription_features FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "school_sub_features_admin_all"
  ON public.school_subscription_features FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "school_sub_plans_select_auth"
  ON public.school_subscription_plans FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "school_sub_plans_admin_write"
  ON public.school_subscription_plans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "school_sub_plans_admin_update"
  ON public.school_subscription_plans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "school_sub_plans_admin_delete"
  ON public.school_subscription_plans FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "school_plan_features_select_auth"
  ON public.school_plan_features FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "school_plan_features_admin_all"
  ON public.school_plan_features FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Admin : voir toutes les écoles (complément aux politiques existantes)
CREATE POLICY "schools_select_admin_all"
  ON public.schools FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
