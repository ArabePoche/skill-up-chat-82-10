-- Table pour les paramètres de bulletin par école
CREATE TABLE public.school_bulletin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  school_year_id UUID NOT NULL REFERENCES public.school_years(id) ON DELETE CASCADE,
  grading_scale NUMERIC NOT NULL DEFAULT 20,
  passing_grade NUMERIC NOT NULL DEFAULT 10,
  show_class_average BOOLEAN DEFAULT true,
  show_rank BOOLEAN DEFAULT true,
  show_appreciation BOOLEAN DEFAULT true,
  show_conduct BOOLEAN DEFAULT true,
  show_absences BOOLEAN DEFAULT true,
  header_text TEXT,
  footer_text TEXT,
  signature_title TEXT DEFAULT 'Le Directeur',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, school_year_id)
);

-- Table pour les mentions (Excellent, Très Bien, etc.)
CREATE TABLE public.school_bulletin_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_average NUMERIC NOT NULL,
  max_average NUMERIC NOT NULL,
  color TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les modèles d'appréciations
CREATE TABLE public.school_bulletin_appreciation_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'excellent', 'good', 'average', 'below_average', 'poor'
  text TEXT NOT NULL,
  min_average NUMERIC,
  max_average NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les modèles de bulletins (layouts)
CREATE TABLE public.school_bulletin_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layout_type TEXT NOT NULL DEFAULT 'classic', -- 'classic', 'modern', 'compact'
  logo_position TEXT DEFAULT 'left', -- 'left', 'center', 'right'
  show_photo BOOLEAN DEFAULT false,
  primary_color TEXT DEFAULT '#1a365d',
  secondary_color TEXT DEFAULT '#2d3748',
  font_family TEXT DEFAULT 'Arial',
  is_default BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour l'historique des bulletins générés
CREATE TABLE public.school_report_card_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  school_year_id UUID NOT NULL REFERENCES public.school_years(id) ON DELETE CASCADE,
  grading_period_id UUID NOT NULL REFERENCES public.grading_periods(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students_school(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.school_bulletin_templates(id) ON DELETE SET NULL,
  general_average NUMERIC,
  rank INTEGER,
  mention TEXT,
  conduct_grade TEXT,
  teacher_appreciation TEXT,
  principal_appreciation TEXT,
  absences_count INTEGER DEFAULT 0,
  late_count INTEGER DEFAULT 0,
  pdf_url TEXT,
  generated_by UUID REFERENCES public.profiles(id),
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_year_id, grading_period_id, student_id)
);

-- Enable RLS
ALTER TABLE public.school_bulletin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_bulletin_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_bulletin_appreciation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_bulletin_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_report_card_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour school_bulletin_settings
CREATE POLICY "Propriétaires peuvent gérer les paramètres de bulletin"
ON public.school_bulletin_settings FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.schools
  WHERE schools.id = school_bulletin_settings.school_id
  AND schools.owner_id = auth.uid()
));

CREATE POLICY "Membres peuvent voir les paramètres de bulletin"
ON public.school_bulletin_settings FOR SELECT
USING (is_school_member(auth.uid(), school_id) OR is_school_owner(auth.uid(), school_id));

-- RLS Policies pour school_bulletin_mentions
CREATE POLICY "Propriétaires peuvent gérer les mentions"
ON public.school_bulletin_mentions FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.schools
  WHERE schools.id = school_bulletin_mentions.school_id
  AND schools.owner_id = auth.uid()
));

CREATE POLICY "Membres peuvent voir les mentions"
ON public.school_bulletin_mentions FOR SELECT
USING (is_school_member(auth.uid(), school_id) OR is_school_owner(auth.uid(), school_id));

-- RLS Policies pour school_bulletin_appreciation_templates
CREATE POLICY "Propriétaires peuvent gérer les modèles d'appréciation"
ON public.school_bulletin_appreciation_templates FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.schools
  WHERE schools.id = school_bulletin_appreciation_templates.school_id
  AND schools.owner_id = auth.uid()
));

CREATE POLICY "Membres peuvent voir les modèles d'appréciation"
ON public.school_bulletin_appreciation_templates FOR SELECT
USING (is_school_member(auth.uid(), school_id) OR is_school_owner(auth.uid(), school_id));

-- RLS Policies pour school_bulletin_templates
CREATE POLICY "Propriétaires peuvent gérer les modèles de bulletin"
ON public.school_bulletin_templates FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.schools
  WHERE schools.id = school_bulletin_templates.school_id
  AND schools.owner_id = auth.uid()
));

CREATE POLICY "Membres peuvent voir les modèles de bulletin"
ON public.school_bulletin_templates FOR SELECT
USING (is_school_member(auth.uid(), school_id) OR is_school_owner(auth.uid(), school_id));

-- RLS Policies pour school_report_card_history
CREATE POLICY "Propriétaires peuvent gérer l'historique des bulletins"
ON public.school_report_card_history FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.schools
  WHERE schools.id = school_report_card_history.school_id
  AND schools.owner_id = auth.uid()
));

CREATE POLICY "Membres peuvent voir l'historique des bulletins"
ON public.school_report_card_history FOR SELECT
USING (is_school_member(auth.uid(), school_id) OR is_school_owner(auth.uid(), school_id));

-- Trigger pour updated_at
CREATE TRIGGER update_school_bulletin_settings_updated_at
BEFORE UPDATE ON public.school_bulletin_settings
FOR EACH ROW EXECUTE FUNCTION public.update_students_school_updated_at();

CREATE TRIGGER update_school_bulletin_mentions_updated_at
BEFORE UPDATE ON public.school_bulletin_mentions
FOR EACH ROW EXECUTE FUNCTION public.update_students_school_updated_at();

CREATE TRIGGER update_school_bulletin_templates_updated_at
BEFORE UPDATE ON public.school_bulletin_templates
FOR EACH ROW EXECUTE FUNCTION public.update_students_school_updated_at();

CREATE TRIGGER update_school_report_card_history_updated_at
BEFORE UPDATE ON public.school_report_card_history
FOR EACH ROW EXECUTE FUNCTION public.update_students_school_updated_at();