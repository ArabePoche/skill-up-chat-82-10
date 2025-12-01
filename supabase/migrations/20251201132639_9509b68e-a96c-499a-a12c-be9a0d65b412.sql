-- Corriger la fonction update_student_payment_progress pour exclure les frais d'inscription
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

  -- Calculer le total dû (avec remise)
  SELECT 
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
  INTO v_total_due
  FROM students_school s
  LEFT JOIN classes c ON s.class_id = c.id
  WHERE s.id = v_student_id;

  -- Date du dernier paiement (tous types)
  SELECT MAX(payment_date)
  INTO v_last_payment_date
  FROM school_students_payment
  WHERE student_id = v_student_id;

  -- Insérer ou mettre à jour avec séparation des frais
  INSERT INTO school_student_payment_progress (
    student_id,
    school_id,
    total_amount_paid,
    total_amount_due,
    remaining_amount,
    registration_fee_paid_amount,
    last_payment_date,
    created_at,
    updated_at
  ) VALUES (
    v_student_id,
    v_school_id,
    v_total_paid,
    v_total_due,
    v_total_due - v_total_paid,
    v_registration_paid,
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
    last_payment_date = EXCLUDED.last_payment_date,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Corriger la fonction update_student_payment_progress_for_student
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

  -- Calculer le total dû (avec remise)
  SELECT 
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
  INTO v_total_due
  FROM students_school s
  LEFT JOIN classes c ON s.class_id = c.id
  WHERE s.id = p_student_id;

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
    last_payment_date,
    created_at,
    updated_at
  ) VALUES (
    p_student_id,
    p_school_id,
    v_total_paid,
    v_total_due,
    v_total_due - v_total_paid,
    v_registration_paid,
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
    last_payment_date = EXCLUDED.last_payment_date,
    updated_at = NOW();
END;
$function$;

-- Recalculer tous les progress pour corriger les données existantes
DO $$
DECLARE
  student_rec RECORD;
BEGIN
  FOR student_rec IN 
    SELECT DISTINCT student_id, school_id 
    FROM school_students_payment
  LOOP
    PERFORM update_student_payment_progress_for_student(
      student_rec.student_id, 
      student_rec.school_id
    );
  END LOOP;
END $$;