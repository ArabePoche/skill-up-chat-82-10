
-- Ajouter price_sc si manquant
ALTER TABLE public.school_site_templates
  ADD COLUMN IF NOT EXISTS price_sc NUMERIC NOT NULL DEFAULT 0;

-- Ajouter site_template_id sur schools si manquant
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS site_template_id UUID REFERENCES public.school_site_templates(id) ON DELETE SET NULL;

-- RLS policies (drop if exist to avoid conflicts)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view active templates" ON public.school_site_templates;
  DROP POLICY IF EXISTS "Admins can manage templates" ON public.school_site_templates;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.school_site_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active templates"
  ON public.school_site_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage templates"
  ON public.school_site_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
