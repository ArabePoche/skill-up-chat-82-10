-- Table pour persister les positions des apps sur le bureau (par user et school)
CREATE TABLE public.school_desktop_app_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL,
  position_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, school_id, app_id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_school_desktop_app_positions_user_school ON public.school_desktop_app_positions(user_id, school_id);

-- Enable RLS
ALTER TABLE public.school_desktop_app_positions ENABLE ROW LEVEL SECURITY;

-- Politiques RLS : chaque utilisateur ne peut voir/modifier que ses propres positions
CREATE POLICY "Users can view their own app positions"
ON public.school_desktop_app_positions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own app positions"
ON public.school_desktop_app_positions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own app positions"
ON public.school_desktop_app_positions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own app positions"
ON public.school_desktop_app_positions
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_school_desktop_app_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_school_desktop_app_positions_updated_at
BEFORE UPDATE ON public.school_desktop_app_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_school_desktop_app_positions_updated_at();