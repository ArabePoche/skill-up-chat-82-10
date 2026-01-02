-- Table des cycles scolaires par école
-- Chaque école peut personnaliser les noms des cycles et leur base de notation
CREATE TABLE public.school_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL, -- Identifiant interne: maternel, primaire, collège, lycée, université
  label VARCHAR(100) NOT NULL, -- Nom affiché (personnalisable): Maternelle, Primaire, etc.
  grade_base INTEGER NOT NULL DEFAULT 20, -- Base de notation: 10, 20, etc.
  order_index INTEGER NOT NULL DEFAULT 0, -- Ordre d'affichage
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, name)
);

-- Enable RLS
ALTER TABLE public.school_cycles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view cycles of their school"
ON public.school_cycles
FOR SELECT
USING (true);

CREATE POLICY "School admins can manage cycles"
ON public.school_cycles
FOR ALL
USING (true);

-- Trigger pour updated_at
CREATE TRIGGER update_school_cycles_updated_at
BEFORE UPDATE ON public.school_cycles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour créer les cycles par défaut lors de la création d'une école
CREATE OR REPLACE FUNCTION public.create_default_school_cycles()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.school_cycles (school_id, name, label, grade_base, order_index)
  VALUES
    (NEW.id, 'maternel', 'Maternel', 10, 1),
    (NEW.id, 'primaire', 'Primaire', 10, 2),
    (NEW.id, 'collège', 'Collège', 20, 3),
    (NEW.id, 'lycée', 'Lycée', 20, 4),
    (NEW.id, 'université', 'Université', 20, 5);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger pour créer automatiquement les cycles par défaut
CREATE TRIGGER create_school_cycles_on_school_creation
AFTER INSERT ON public.schools
FOR EACH ROW
EXECUTE FUNCTION public.create_default_school_cycles();

-- Insérer les cycles par défaut pour les écoles existantes
INSERT INTO public.school_cycles (school_id, name, label, grade_base, order_index)
SELECT s.id, c.name, c.label, c.grade_base, c.order_index
FROM public.schools s
CROSS JOIN (
  VALUES 
    ('maternel', 'Maternel', 10, 1),
    ('primaire', 'Primaire', 10, 2),
    ('collège', 'Collège', 20, 3),
    ('lycée', 'Lycée', 20, 4),
    ('université', 'Université', 20, 5)
) AS c(name, label, grade_base, order_index)
WHERE NOT EXISTS (
  SELECT 1 FROM public.school_cycles sc 
  WHERE sc.school_id = s.id AND sc.name = c.name
);