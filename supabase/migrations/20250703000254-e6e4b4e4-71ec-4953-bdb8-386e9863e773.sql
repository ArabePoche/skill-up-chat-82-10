-- Étape 1: Mettre à jour les références dans les objets du storage AVANT de modifier le bucket
UPDATE storage.objects 
SET bucket_id = 'students_exercises_submission_files'
WHERE bucket_id = 'exercise_files';

-- Étape 2: Créer le nouveau bucket pour les fichiers d'exercices des leçons
INSERT INTO storage.buckets (id, name, public)
VALUES ('students_exercises_submission_files', 'students_exercises_submission_files', true);

-- Étape 3: Supprimer l'ancien bucket maintenant qu'il n'a plus de références
DELETE FROM storage.buckets WHERE id = 'exercise_files';

-- Étape 4: Créer le nouveau bucket pour les fichiers d'exercices des leçons (ajoutés par les admins)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lessons_exercises_files', 'lessons_exercises_files', true);

-- Créer les policies pour le nouveau bucket lessons_exercises_files
CREATE POLICY "Admins can insert lessons exercise files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'lessons_exercises_files' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update lessons exercise files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'lessons_exercises_files' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete lessons exercise files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'lessons_exercises_files' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can view lessons exercise files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'lessons_exercises_files' AND
  auth.role() = 'authenticated'
);

-- Mettre à jour les policies pour le bucket renommé students_exercises_submission_files
DROP POLICY IF EXISTS "Admins can insert exercise files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update exercise files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete exercise files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view exercise files" ON storage.objects;

CREATE POLICY "Students can insert submission files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'students_exercises_submission_files' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Students can update their submission files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'students_exercises_submission_files' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Admins and teachers can delete submission files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'students_exercises_submission_files' AND
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_teacher = true
  ))
);

CREATE POLICY "Users can view submission files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'students_exercises_submission_files' AND
  auth.role() = 'authenticated'
);

-- Créer/Mettre à jour la fonction pour traiter les évaluations d'entretien et payer les professeurs
CREATE OR REPLACE FUNCTION public.handle_interview_evaluation_response()
RETURNS TRIGGER AS $$
DECLARE
  pricing_rule RECORD;
  payment_amount NUMERIC := 0;
  description TEXT;
BEGIN
  -- Seulement si l'évaluation vient d'être répondue
  IF OLD.responded_at IS NULL AND NEW.responded_at IS NOT NULL THEN
    
    -- Récupérer la règle de tarification pour ce professeur
    SELECT * INTO pricing_rule
    FROM teacher_pricing_rules
    WHERE teacher_id = NEW.teacher_id
      AND (formation_id = NEW.formation_id OR formation_id IS NULL)
      AND is_active = true
    ORDER BY CASE WHEN formation_id IS NOT NULL THEN 1 ELSE 2 END
    LIMIT 1;
    
    -- Déterminer le montant et la description selon la satisfaction
    IF NEW.is_satisfied = true THEN
      payment_amount := COALESCE(pricing_rule.entretien_satisfait_price, 0);
      description := 'Paiement entretien satisfait';
    ELSE
      payment_amount := COALESCE(pricing_rule.entretien_non_satisfait_price, 0);
      description := 'Paiement entretien non satisfait';
    END IF;
    
    -- Effectuer le paiement si le montant est positif
    IF payment_amount > 0 THEN
      PERFORM process_teacher_payment(
        NEW.teacher_id,
        'interview_payment',
        payment_amount,
        NEW.id,
        description
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger pour les réponses aux évaluations
DROP TRIGGER IF EXISTS trigger_interview_evaluation_response ON interview_evaluations;
CREATE TRIGGER trigger_interview_evaluation_response
  AFTER UPDATE ON interview_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION handle_interview_evaluation_response();

-- Mettre à jour la fonction process_expired_evaluations pour utiliser le nouveau système
CREATE OR REPLACE FUNCTION public.process_expired_evaluations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  evaluation RECORD;
BEGIN
  -- Traiter les évaluations expirées (satisfaction implicite)
  FOR evaluation IN 
    SELECT * FROM interview_evaluations 
    WHERE expires_at < now() AND responded_at IS NULL
  LOOP
    -- Marquer comme satisfait par défaut et déclencher le paiement
    UPDATE interview_evaluations 
    SET is_satisfied = true, responded_at = now()
    WHERE id = evaluation.id;
  END LOOP;
END;
$$;