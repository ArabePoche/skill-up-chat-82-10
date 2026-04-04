-- Ajout de modèles de site (templates) pour les écoles
-- Limités aux plans qui ont la fonctionnalité 'premium_site_templates' activée

CREATE TABLE IF NOT EXISTS public.school_site_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  thumbnail_url text,
  theme_config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Ajouter une colonne à schools pour lier un temple 
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS site_template_id uuid REFERENCES public.school_site_templates(id) ON DELETE SET NULL;

-- Ajouter la fonctionnalité aux features existantes
INSERT INTO public.school_subscription_features (feature_key, label, description, category, sort_order)
VALUES
  ('premium_site_templates', 'Modèles de site premium', 'Accès à des thèmes et designs professionnels prêts à l''emploi', 'visibilite', 15)
ON CONFLICT (feature_key) DO NOTHING;

-- L'associer au plan premium (id défini dans le précédent script plan: a0000001-0000-4000-8000-000000000003)
INSERT INTO public.school_plan_features (plan_id, feature_key, enabled)
VALUES ('a0000001-0000-4000-8000-000000000003', 'premium_site_templates', true)
ON CONFLICT (plan_id, feature_key) DO UPDATE SET enabled = true;

-- Retirer les anciens si besoin pour éviter les doublons lors des re-exécutions
DELETE FROM public.school_site_templates WHERE id IN ('b0000001-0000-4000-8000-000000000001', 'b0000001-0000-4000-8000-000000000002', 'b0000001-0000-4000-8000-000000000003');

-- Insérer quelques templates par défaut
INSERT INTO public.school_site_templates (id, name, description, theme_config)
VALUES 
  ('b0000001-0000-4000-8000-000000000001', 'Classique', 'Modèle basique et épuré pour tout type d''école.', '{"primary_color": "#0d6efd", "secondary_color": "#0a58ca", "font_family": "Inter", "layout": "default"}'::jsonb),
  ('b0000001-0000-4000-8000-000000000002', 'Élégance', 'Design large et moderne, avec marges épurées, parfait pour écoles supérieures.', '{"primary_color": "#111827", "secondary_color": "#374151", "font_family": "Playfair Display", "layout": "wide"}'::jsonb),
  ('b0000001-0000-4000-8000-000000000003', 'minimaliste', 'Couleurs vives sur fond clair, idéal pour préscolaire/primaire.', '{"primary_color": "#f59e0b", "secondary_color": "#d97706", "font_family": "Nunito", "layout": "minimal"}'::jsonb);
