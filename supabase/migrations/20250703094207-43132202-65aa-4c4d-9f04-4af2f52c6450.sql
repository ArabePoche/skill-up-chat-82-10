-- Ajouter la policy manquante pour l'upload des fichiers d'exercices
CREATE POLICY "Only admins can insert lessons exercise files"
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'lessons_exercises_files' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'::user_role
  )
);

-- Policy pour le compte système
CREATE POLICY "System can upload lessons exercise files"
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'lessons_exercises_files' 
  AND auth.uid() = '4c32c988-3b19-4eca-87cb-0e0595fd7fbb'::uuid
);

-- Ajouter une table pour stocker les types d'abonnement des utilisateurs
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  formation_id UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'standard', 'premium')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, formation_id)
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies pour user_subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.user_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
ON public.user_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
ON public.user_subscriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'::user_role
  )
);

CREATE POLICY "Admins can manage all subscriptions"
ON public.user_subscriptions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'::user_role
  )
);

-- Trigger pour incrémenter automatiquement students_count
CREATE OR REPLACE FUNCTION increment_formation_students_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    UPDATE formations 
    SET students_count = COALESCE(students_count, 0) + 1 
    WHERE id = NEW.formation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_students_count_trigger
  AFTER UPDATE ON enrollment_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_formation_students_count();