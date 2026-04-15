-- Table des activités scolaires (en cours, passées, à venir)
CREATE TABLE public.school_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  activity_date DATE NOT NULL,
  end_date DATE,
  location TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'past')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes par école
CREATE INDEX idx_school_activities_school_id ON public.school_activities(school_id);
CREATE INDEX idx_school_activities_status ON public.school_activities(status);

-- RLS
ALTER TABLE public.school_activities ENABLE ROW LEVEL SECURITY;

-- Lecture publique
CREATE POLICY "Anyone can view school activities"
  ON public.school_activities FOR SELECT
  USING (true);

-- CRUD pour les membres authentifiés (le contrôle fin se fait côté app)
CREATE POLICY "Authenticated users can insert activities"
  ON public.school_activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update activities"
  ON public.school_activities FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete activities"
  ON public.school_activities FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);