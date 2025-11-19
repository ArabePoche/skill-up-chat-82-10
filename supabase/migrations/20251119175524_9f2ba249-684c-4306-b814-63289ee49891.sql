-- Table pour les demandes d'adhésion aux écoles
CREATE TABLE public.school_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  form_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_school_join_requests_school_id ON public.school_join_requests(school_id);
CREATE INDEX idx_school_join_requests_user_id ON public.school_join_requests(user_id);
CREATE INDEX idx_school_join_requests_status ON public.school_join_requests(status);

-- RLS Policies
ALTER TABLE public.school_join_requests ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres demandes
CREATE POLICY "Users can view their own join requests"
ON public.school_join_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Les utilisateurs peuvent créer leurs propres demandes
CREATE POLICY "Users can create their own join requests"
ON public.school_join_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Les membres de l'école peuvent voir les demandes de leur école
CREATE POLICY "School members can view school join requests"
ON public.school_join_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.school_members sm
    WHERE sm.school_id = school_join_requests.school_id
    AND sm.user_id = auth.uid()
  )
);

-- Les propriétaires d'école peuvent approuver/rejeter les demandes
CREATE POLICY "School owners can update join requests"
ON public.school_join_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.schools s
    WHERE s.id = school_join_requests.school_id
    AND s.owner_id = auth.uid()
  )
);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_school_join_requests_updated_at
  BEFORE UPDATE ON public.school_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_students_school_updated_at();