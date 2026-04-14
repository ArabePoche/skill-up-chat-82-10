
-- 1. Ajouter les champs d'exigibilité sur students_school
ALTER TABLE public.students_school 
  ADD COLUMN IF NOT EXISTS enrollment_date DATE,
  ADD COLUMN IF NOT EXISTS first_due_month DATE,
  ADD COLUMN IF NOT EXISTS include_enrollment_month BOOLEAN DEFAULT TRUE;

-- Initialiser enrollment_date à partir de created_at pour les existants
UPDATE public.students_school 
SET enrollment_date = (created_at AT TIME ZONE 'UTC')::date
WHERE enrollment_date IS NULL;

-- Rendre enrollment_date NOT NULL avec default
ALTER TABLE public.students_school 
  ALTER COLUMN enrollment_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN enrollment_date SET NOT NULL;

-- 2. Ajouter les champs de proratisation sur school_student_payment_progress
ALTER TABLE public.school_student_payment_progress
  ADD COLUMN IF NOT EXISTS billable_months INTEGER,
  ADD COLUMN IF NOT EXISTS prorated_amount_due NUMERIC DEFAULT 0;

-- 3. Fonction utilitaire pour calculer le first_due_month
CREATE OR REPLACE FUNCTION public.calculate_first_due_month(
  p_enrollment_date DATE,
  p_include_enrollment_month BOOLEAN DEFAULT TRUE
)
RETURNS DATE
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_day INTEGER;
BEGIN
  v_day := EXTRACT(DAY FROM p_enrollment_date);
  
  -- Si arrivée avant ou le 10 : le mois d'arrivée est dû
  IF v_day <= 10 THEN
    RETURN DATE_TRUNC('month', p_enrollment_date)::date;
  END IF;
  
  -- Si arrivée après le 10 : selon le choix utilisateur
  IF p_include_enrollment_month THEN
    RETURN DATE_TRUNC('month', p_enrollment_date)::date;
  ELSE
    RETURN (DATE_TRUNC('month', p_enrollment_date) + INTERVAL '1 month')::date;
  END IF;
END;
$$;

-- 4. Fonction utilitaire pour calculer le nombre de mois exigibles
CREATE OR REPLACE FUNCTION public.calculate_billable_months(
  p_first_due_month DATE,
  p_school_year_end DATE
)
RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_months INTEGER;
BEGIN
  v_months := (EXTRACT(YEAR FROM p_school_year_end) - EXTRACT(YEAR FROM p_first_due_month)) * 12
            + (EXTRACT(MONTH FROM p_school_year_end) - EXTRACT(MONTH FROM p_first_due_month)) + 1;
  RETURN GREATEST(v_months, 1);
END;
$$;

-- 5. Mettre à jour le trigger principal de recalcul de progression
CREATE OR REPLACE FUNCTION public.update_student_payment_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_student_id uuid;
  v_school_id uuid;
  v_total_paid numeric;
  v_registration_paid numeric;
  v_total_due numeric;
  v_last_payment_date timestamptz;
  v_enrollment_date date;
  v_include_enrollment_month boolean;
  v_first_due_month date;
  v_school_year_end date;
  v_billable_months integer;
  v_total_school_months integer;
  v_prorated_due numeric;
  v_annual_fee numeric;
BEGIN
  -- Déterminer l'élève concerné
  IF TG_OP = 'DELETE' THEN
    v_student_id := OLD.student_id;
    v_school_id := OLD.school_id;
  ELSE
    v_student_id := NEW.student_id;
    v_school_id := NEW.school_id;
  END IF;

  -- Calculer le total payé SANS les frais d'inscription
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM school_students_payment
  WHERE student_id = v_student_id
    AND payment_type != 'registration';

  -- Calculer séparément les frais d'inscription
  SELECT COALESCE(SUM(amount), 0)
  INTO v_registration_paid
  FROM school_students_payment
  WHERE student_id = v_student_id
    AND payment_type = 'registration';

  -- Récupérer les infos de l'élève et de la classe
  SELECT 
    s.enrollment_date,
    s.include_enrollment_month,
    COALESCE(c.annual_fee, 0),
    COALESCE(
      CASE
        WHEN s.discount_percentage IS NOT NULL AND s.discount_percentage > 0 THEN
          c.annual_fee * (1 - s.discount_percentage / 100)
        WHEN s.discount_amount IS NOT NULL AND s.discount_amount > 0 THEN
          c.annual_fee - s.discount_amount
        ELSE
          c.annual_fee
      END,
      c.annual_fee,
      0
    )
  INTO v_enrollment_date, v_include_enrollment_month, v_annual_fee, v_total_due
  FROM students_school s
  LEFT JOIN classes c ON s.class_id = c.id
  WHERE s.id = v_student_id;

  -- Récupérer la fin de l'année scolaire
  SELECT sy.end_date::date
  INTO v_school_year_end
  FROM students_school s
  JOIN school_years sy ON s.school_year_id = sy.id
  WHERE s.id = v_student_id;

  -- Calculer le premier mois dû et les mois exigibles
  v_first_due_month := calculate_first_due_month(v_enrollment_date, COALESCE(v_include_enrollment_month, true));
  
  -- Nombre total de mois de l'année scolaire (depuis le début de l'année scolaire)
  SELECT calculate_billable_months(sy.start_date::date, sy.end_date::date)
  INTO v_total_school_months
  FROM students_school s
  JOIN school_years sy ON s.school_year_id = sy.id
  WHERE s.id = v_student_id;
  
  -- Nombre de mois exigibles pour cet élève
  v_billable_months := calculate_billable_months(v_first_due_month, v_school_year_end);
  
  -- Proratiser le montant dû
  IF v_total_school_months > 0 THEN
    v_prorated_due := ROUND((v_total_due::numeric / v_total_school_months) * v_billable_months, 0);
  ELSE
    v_prorated_due := v_total_due;
  END IF;

  -- Date du dernier paiement (tous types)
  SELECT MAX(payment_date)
  INTO v_last_payment_date
  FROM school_students_payment
  WHERE student_id = v_student_id;

  -- Insérer ou mettre à jour avec proratisation
  INSERT INTO school_student_payment_progress (
    student_id,
    school_id,
    total_amount_paid,
    total_amount_due,
    remaining_amount,
    registration_fee_paid_amount,
    billable_months,
    prorated_amount_due,
    last_payment_date,
    created_at,
    updated_at
  ) VALUES (
    v_student_id,
    v_school_id,
    v_total_paid,
    v_prorated_due,
    v_prorated_due - v_total_paid,
    v_registration_paid,
    v_billable_months,
    v_prorated_due,
    v_last_payment_date,
    NOW(),
    NOW()
  )
  ON CONFLICT (student_id, school_id)
  DO UPDATE SET
    total_amount_paid = EXCLUDED.total_amount_paid,
    total_amount_due = EXCLUDED.total_amount_due,
    remaining_amount = EXCLUDED.remaining_amount,
    registration_fee_paid_amount = EXCLUDED.registration_fee_paid_amount,
    billable_months = EXCLUDED.billable_months,
    prorated_amount_due = EXCLUDED.prorated_amount_due,
    last_payment_date = EXCLUDED.last_payment_date,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 6. Mettre à jour la fonction helper
CREATE OR REPLACE FUNCTION public.update_student_payment_progress_for_student(p_student_id uuid, p_school_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_total_paid numeric;
  v_registration_paid numeric;
  v_total_due numeric;
  v_last_payment_date timestamptz;
  v_enrollment_date date;
  v_include_enrollment_month boolean;
  v_first_due_month date;
  v_school_year_end date;
  v_billable_months integer;
  v_total_school_months integer;
  v_prorated_due numeric;
  v_annual_fee numeric;
BEGIN
  -- Calculer le total payé SANS les frais d'inscription
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM school_students_payment
  WHERE student_id = p_student_id
    AND payment_type != 'registration';

  -- Calculer séparément les frais d'inscription
  SELECT COALESCE(SUM(amount), 0)
  INTO v_registration_paid
  FROM school_students_payment
  WHERE student_id = p_student_id
    AND payment_type = 'registration';

  -- Récupérer les infos de l'élève
  SELECT 
    s.enrollment_date,
    s.include_enrollment_month,
    COALESCE(c.annual_fee, 0),
    COALESCE(
      CASE
        WHEN s.discount_percentage IS NOT NULL AND s.discount_percentage > 0 THEN
          c.annual_fee * (1 - s.discount_percentage / 100)
        WHEN s.discount_amount IS NOT NULL AND s.discount_amount > 0 THEN
          c.annual_fee - s.discount_amount
        ELSE
          c.annual_fee
      END,
      c.annual_fee,
      0
    )
  INTO v_enrollment_date, v_include_enrollment_month, v_annual_fee, v_total_due
  FROM students_school s
  LEFT JOIN classes c ON s.class_id = c.id
  WHERE s.id = p_student_id;

  -- Récupérer la fin de l'année scolaire
  SELECT sy.end_date::date
  INTO v_school_year_end
  FROM students_school s
  JOIN school_years sy ON s.school_year_id = sy.id
  WHERE s.id = p_student_id;

  -- Calculer le premier mois dû
  v_first_due_month := calculate_first_due_month(
    COALESCE(v_enrollment_date, CURRENT_DATE), 
    COALESCE(v_include_enrollment_month, true)
  );

  -- Nombre total de mois de l'année scolaire
  SELECT calculate_billable_months(sy.start_date::date, sy.end_date::date)
  INTO v_total_school_months
  FROM students_school s
  JOIN school_years sy ON s.school_year_id = sy.id
  WHERE s.id = p_student_id;

  -- Nombre de mois exigibles pour cet élève
  v_billable_months := calculate_billable_months(v_first_due_month, COALESCE(v_school_year_end, CURRENT_DATE));

  -- Proratiser
  IF v_total_school_months > 0 THEN
    v_prorated_due := ROUND((v_total_due::numeric / v_total_school_months) * v_billable_months, 0);
  ELSE
    v_prorated_due := v_total_due;
  END IF;

  SELECT MAX(payment_date)
  INTO v_last_payment_date
  FROM school_students_payment
  WHERE student_id = p_student_id;

  INSERT INTO school_student_payment_progress (
    student_id,
    school_id,
    total_amount_paid,
    total_amount_due,
    remaining_amount,
    registration_fee_paid_amount,
    billable_months,
    prorated_amount_due,
    last_payment_date,
    created_at,
    updated_at
  ) VALUES (
    p_student_id,
    p_school_id,
    v_total_paid,
    v_prorated_due,
    v_prorated_due - v_total_paid,
    v_registration_paid,
    v_billable_months,
    v_prorated_due,
    v_last_payment_date,
    NOW(),
    NOW()
  )
  ON CONFLICT (student_id, school_id)
  DO UPDATE SET
    total_amount_paid = EXCLUDED.total_amount_paid,
    total_amount_due = EXCLUDED.total_amount_due,
    remaining_amount = EXCLUDED.remaining_amount,
    registration_fee_paid_amount = EXCLUDED.registration_fee_paid_amount,
    billable_months = EXCLUDED.billable_months,
    prorated_amount_due = EXCLUDED.prorated_amount_due,
    last_payment_date = EXCLUDED.last_payment_date,
    updated_at = NOW();
END;
$function$;

-- 7. Mettre à jour le first_due_month pour les élèves existants
UPDATE public.students_school
SET first_due_month = calculate_first_due_month(enrollment_date, COALESCE(include_enrollment_month, true))
WHERE first_due_month IS NULL;

-- 8. Mettre à jour le trigger sur students_school pour inclure enrollment_date
DROP TRIGGER IF EXISTS update_payment_progress_on_student_change ON students_school;
CREATE TRIGGER update_payment_progress_on_student_change
AFTER UPDATE OF discount_percentage, discount_amount, class_id, enrollment_date, include_enrollment_month, first_due_month ON students_school
FOR EACH ROW
EXECUTE FUNCTION update_student_payment_progress_on_student_change();

-- 9. Recalculer TOUS les progrès de paiement pour intégrer la proratisation
DO $$
DECLARE
  student_rec RECORD;
BEGIN
  FOR student_rec IN 
    SELECT id, school_id FROM students_school WHERE status = 'active'
  LOOP
    PERFORM update_student_payment_progress_for_student(
      student_rec.id, 
      student_rec.school_id
    );
  END LOOP;
END $$;
