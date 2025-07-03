
-- Vérifier et créer les policies RLS manquantes pour enrollment_requests
DROP POLICY IF EXISTS "Users can view their own enrollment requests" ON public.enrollment_requests;
DROP POLICY IF EXISTS "Users can create enrollment requests" ON public.enrollment_requests;
DROP POLICY IF EXISTS "Admins can view all enrollment requests" ON public.enrollment_requests;
DROP POLICY IF EXISTS "Teachers can view enrollment requests for their formations" ON public.enrollment_requests;

-- Enable RLS sur enrollment_requests si pas déjà fait
ALTER TABLE public.enrollment_requests ENABLE ROW LEVEL SECURITY;

-- Policy pour que les utilisateurs voient leurs propres demandes d'inscription
CREATE POLICY "Users can view their own enrollment requests" 
ON public.enrollment_requests FOR SELECT 
USING (user_id = auth.uid());

-- Policy pour que les utilisateurs créent leurs propres demandes
CREATE POLICY "Users can create enrollment requests" 
ON public.enrollment_requests FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Policy pour que les admins voient toutes les demandes
CREATE POLICY "Admins can view all enrollment requests" 
ON public.enrollment_requests FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy pour que les enseignants voient les demandes de leurs formations
CREATE POLICY "Teachers can view enrollment requests for their formations" 
ON public.enrollment_requests FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.formations 
    WHERE id = enrollment_requests.formation_id AND author_id = auth.uid()
  )
);

-- Vérifier les policies pour formations
DROP POLICY IF EXISTS "Anyone can view active formations" ON public.formations;
CREATE POLICY "Anyone can view active formations" 
ON public.formations FOR SELECT 
USING (is_active = true);

-- Enable RLS sur formations si pas déjà fait
ALTER TABLE public.formations ENABLE ROW LEVEL SECURITY;
