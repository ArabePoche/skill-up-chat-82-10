-- Créer les tables pour les candidatures d'enseignants
CREATE TABLE public.teacher_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  motivation_message TEXT,
  experience_years INTEGER,
  education_level TEXT,
  specialties TEXT[],
  availability TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.teacher_application_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.teacher_applications(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.teacher_application_formations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.teacher_applications(id) ON DELETE CASCADE,
  formation_id UUID NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(application_id, formation_id)
);

CREATE TABLE public.teacher_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.teacher_applications(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur toutes les nouvelles tables
ALTER TABLE public.teacher_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_application_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_application_formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_reviews ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour teacher_applications
CREATE POLICY "Users can create their own applications" 
ON public.teacher_applications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own applications" 
ON public.teacher_applications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their pending applications" 
ON public.teacher_applications 
FOR UPDATE 
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all applications" 
ON public.teacher_applications 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can update all applications" 
ON public.teacher_applications 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

-- Politiques RLS pour teacher_application_files
CREATE POLICY "Users can manage files for their applications" 
ON public.teacher_application_files 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM teacher_applications ta 
  WHERE ta.id = application_id AND ta.user_id = auth.uid()
));

CREATE POLICY "Admins can view all application files" 
ON public.teacher_application_files 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

-- Politiques RLS pour teacher_application_formations
CREATE POLICY "Users can manage formations for their applications" 
ON public.teacher_application_formations 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM teacher_applications ta 
  WHERE ta.id = application_id AND ta.user_id = auth.uid()
));

CREATE POLICY "Admins can view all application formations" 
ON public.teacher_application_formations 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

-- Politiques RLS pour teacher_reviews
CREATE POLICY "Admins can create reviews" 
ON public.teacher_reviews 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Users and admins can view reviews" 
ON public.teacher_reviews 
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
  EXISTS (
    SELECT 1 FROM teacher_applications ta 
    WHERE ta.id = application_id AND ta.user_id = auth.uid()
  )
);

-- Fonction pour traiter l'approbation d'une candidature
CREATE OR REPLACE FUNCTION public.approve_teacher_application(
  p_application_id UUID,
  p_reviewer_id UUID,
  p_comment TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_teacher_id UUID;
  formation_record RECORD;
BEGIN
  -- Récupérer l'user_id de la candidature
  SELECT user_id INTO v_user_id 
  FROM teacher_applications 
  WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Mettre à jour le statut de la candidature
  UPDATE teacher_applications 
  SET status = 'approved', 
      reviewed_at = now(),
      reviewed_by = p_reviewer_id
  WHERE id = p_application_id;

  -- Créer l'enregistrement teacher
  INSERT INTO teachers (user_id, created_at, updated_at)
  VALUES (v_user_id, now(), now())
  RETURNING id INTO v_teacher_id;

  -- Ajouter les formations sélectionnées
  FOR formation_record IN 
    SELECT formation_id FROM teacher_application_formations 
    WHERE application_id = p_application_id
  LOOP
    INSERT INTO teacher_formations (teacher_id, formation_id, assigned_at)
    VALUES (v_teacher_id, formation_record.formation_id, now());
  END LOOP;

  -- Créer l'enregistrement de review
  INSERT INTO teacher_reviews (application_id, reviewer_id, decision, comment)
  VALUES (p_application_id, p_reviewer_id, 'approved', p_comment);

  -- Créer une notification pour l'utilisateur
  INSERT INTO notifications (
    title,
    message,
    type,
    user_id,
    is_read
  ) VALUES (
    'Candidature approuvée !',
    'Félicitations ! Votre candidature pour devenir encadreur a été approuvée. Vous pouvez maintenant accéder aux outils d''enseignement.',
    'teacher_application_approved',
    v_user_id,
    false
  );
END;
$$;

-- Fonction pour rejeter une candidature
CREATE OR REPLACE FUNCTION public.reject_teacher_application(
  p_application_id UUID,
  p_reviewer_id UUID,
  p_comment TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Récupérer l'user_id de la candidature
  SELECT user_id INTO v_user_id 
  FROM teacher_applications 
  WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Mettre à jour le statut de la candidature
  UPDATE teacher_applications 
  SET status = 'rejected', 
      reviewed_at = now(),
      reviewed_by = p_reviewer_id
  WHERE id = p_application_id;

  -- Créer l'enregistrement de review
  INSERT INTO teacher_reviews (application_id, reviewer_id, decision, comment)
  VALUES (p_application_id, p_reviewer_id, 'rejected', p_comment);

  -- Créer une notification pour l'utilisateur
  INSERT INTO notifications (
    title,
    message,
    type,
    user_id,
    is_read
  ) VALUES (
    'Candidature non retenue',
    CASE 
      WHEN p_comment IS NOT NULL THEN 
        'Votre candidature pour devenir encadreur n''a pas été retenue. Commentaire : ' || p_comment
      ELSE 
        'Votre candidature pour devenir encadreur n''a pas été retenue. Vous pouvez soumettre une nouvelle candidature après avoir amélioré votre dossier.'
    END,
    'teacher_application_rejected',
    v_user_id,
    false
  );
END;
$$;

-- Trigger pour notifier les admins d'une nouvelle candidature
CREATE OR REPLACE FUNCTION public.notify_admins_new_teacher_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Créer une notification pour tous les admins
  INSERT INTO notifications (
    title,
    message,
    type,
    is_for_all_admins,
    user_id,
    is_read
  ) VALUES (
    'Nouvelle candidature d''encadreur',
    'Une nouvelle candidature pour devenir encadreur nécessite votre validation.',
    'teacher_application_request',
    true,
    NULL,
    false
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_admins_teacher_application
  AFTER INSERT ON teacher_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_teacher_application();

-- Créer un bucket de stockage pour les fichiers de candidature
INSERT INTO storage.buckets (id, name, public) 
VALUES ('teacher_application_files', 'teacher_application_files', false)
ON CONFLICT (id) DO NOTHING;

-- Politiques de stockage pour les fichiers de candidature
CREATE POLICY "Users can upload their application files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'teacher_application_files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their application files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'teacher_application_files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all application files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'teacher_application_files' AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can delete their application files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'teacher_application_files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);