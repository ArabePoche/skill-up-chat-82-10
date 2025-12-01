-- Corriger le calcul des paiements pour séparer frais d'inscription et scolarité

-- 1. Fonction pour recalculer après insertion/mise à jour
CREATE OR REPLACE FUNCTION public.update_school_student_payment_progress()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_annual_fee DECIMAL(10,2);
  v_discount_percentage DECIMAL(5,2);
  v_discount_amount DECIMAL(10,2);
  v_discounted_amount DECIMAL(10,2);
  v_total_paid DECIMAL(10,2);
  v_registration_paid DECIMAL(10,2);
BEGIN
  -- Récupérer le tarif annuel de la classe et les remises de l'élève
  SELECT 
    c.annual_fee,
    s.discount_percentage,
    s.discount_amount
  INTO 
    v_annual_fee,
    v_discount_percentage,
    v_discount_amount
  FROM students_school s
  LEFT JOIN classes c ON s.class_id = c.id
  WHERE s.id = NEW.student_id;

  -- Calculer le montant avec remise appliquée
  v_discounted_amount := calculate_amount_with_discount(
    COALESCE(v_annual_fee, 0),
    v_discount_percentage,
    v_discount_amount
  );

  -- Calculer le total payé UNIQUEMENT pour les paiements de scolarité (exclure registration)
  SELECT 
    COALESCE(SUM(amount), 0)
  INTO 
    v_total_paid
  FROM school_students_payment
  WHERE student_id = NEW.student_id
    AND payment_type != 'registration';

  -- Calculer séparément les paiements d'inscription
  SELECT 
    COALESCE(SUM(amount), 0)
  INTO 
    v_registration_paid
  FROM school_students_payment
  WHERE student_id = NEW.student_id
    AND payment_type = 'registration';

  -- Mettre à jour ou créer la progression
  INSERT INTO school_student_payment_progress (
    student_id,
    school_id,
    total_amount_paid,
    total_amount_due,
    remaining_amount,
    registration_fee_paid_amount,
    last_payment_date
  )
  VALUES (
    NEW.student_id,
    NEW.school_id,
    v_total_paid,
    v_discounted_amount,
    v_discounted_amount - v_total_paid,
    v_registration_paid,
    NEW.payment_date
  )
  ON CONFLICT (student_id) DO UPDATE SET
    total_amount_paid = v_total_paid,
    total_amount_due = v_discounted_amount,
    remaining_amount = v_discounted_amount - v_total_paid,
    registration_fee_paid_amount = v_registration_paid,
    last_payment_date = GREATEST(school_student_payment_progress.last_payment_date, NEW.payment_date),
    updated_at = NOW();

  RETURN NEW;
END;
$function$;

-- 2. Fonction pour recalculer après suppression
CREATE OR REPLACE FUNCTION public.recalculate_student_payment_progress_on_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_annual_fee DECIMAL(10,2);
  v_discount_percentage DECIMAL(5,2);
  v_discount_amount DECIMAL(10,2);
  v_discounted_amount DECIMAL(10,2);
  v_total_paid DECIMAL(10,2);
  v_registration_paid DECIMAL(10,2);
  v_last_payment_date TIMESTAMP;
BEGIN
  -- Récupérer le tarif annuel et les remises de l'élève
  SELECT 
    c.annual_fee,
    s.discount_percentage,
    s.discount_amount
  INTO 
    v_annual_fee,
    v_discount_percentage,
    v_discount_amount
  FROM students_school s
  LEFT JOIN classes c ON s.class_id = c.id
  WHERE s.id = OLD.student_id;

  -- Calculer le montant avec remise appliquée
  v_discounted_amount := calculate_amount_with_discount(
    COALESCE(v_annual_fee, 0),
    v_discount_percentage,
    v_discount_amount
  );

  -- Calculer le total payé UNIQUEMENT pour les paiements de scolarité (exclure registration)
  SELECT 
    COALESCE(SUM(amount), 0),
    MAX(payment_date)
  INTO 
    v_total_paid,
    v_last_payment_date
  FROM school_students_payment
  WHERE student_id = OLD.student_id
    AND payment_type != 'registration';

  -- Calculer séparément les paiements d'inscription
  SELECT 
    COALESCE(SUM(amount), 0)
  INTO 
    v_registration_paid
  FROM school_students_payment
  WHERE student_id = OLD.student_id
    AND payment_type = 'registration';

  -- Mettre à jour ou créer la progression
  INSERT INTO school_student_payment_progress (
    student_id,
    school_id,
    total_amount_paid,
    total_amount_due,
    remaining_amount,
    registration_fee_paid_amount,
    last_payment_date
  )
  VALUES (
    OLD.student_id,
    OLD.school_id,
    v_total_paid,
    v_discounted_amount,
    v_discounted_amount - v_total_paid,
    v_registration_paid,
    v_last_payment_date
  )
  ON CONFLICT (student_id) DO UPDATE SET
    total_amount_paid = v_total_paid,
    total_amount_due = v_discounted_amount,
    remaining_amount = v_discounted_amount - v_total_paid,
    registration_fee_paid_amount = v_registration_paid,
    last_payment_date = v_last_payment_date,
    updated_at = NOW();

  RETURN OLD;
END;
$function$;

-- 3. Recalculer tous les progrès de paiement existants pour corriger les données
DO $$
DECLARE
  student_record RECORD;
  v_annual_fee DECIMAL(10,2);
  v_discount_percentage DECIMAL(5,2);
  v_discount_amount DECIMAL(10,2);
  v_discounted_amount DECIMAL(10,2);
  v_total_paid DECIMAL(10,2);
  v_registration_paid DECIMAL(10,2);
  v_last_payment_date TIMESTAMP;
BEGIN
  FOR student_record IN 
    SELECT DISTINCT student_id, school_id 
    FROM school_students_payment
  LOOP
    -- Récupérer le tarif annuel et les remises de l'élève
    SELECT 
      c.annual_fee,
      s.discount_percentage,
      s.discount_amount
    INTO 
      v_annual_fee,
      v_discount_percentage,
      v_discount_amount
    FROM students_school s
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE s.id = student_record.student_id;

    -- Calculer le montant avec remise appliquée
    v_discounted_amount := calculate_amount_with_discount(
      COALESCE(v_annual_fee, 0),
      v_discount_percentage,
      v_discount_amount
    );

    -- Calculer le total payé UNIQUEMENT pour les paiements de scolarité
    SELECT 
      COALESCE(SUM(amount), 0),
      MAX(payment_date)
    INTO 
      v_total_paid,
      v_last_payment_date
    FROM school_students_payment
    WHERE student_id = student_record.student_id
      AND payment_type != 'registration';

    -- Calculer séparément les paiements d'inscription
    SELECT 
      COALESCE(SUM(amount), 0)
    INTO 
      v_registration_paid
    FROM school_students_payment
    WHERE student_id = student_record.student_id
      AND payment_type = 'registration';

    -- Mettre à jour la progression
    INSERT INTO school_student_payment_progress (
      student_id,
      school_id,
      total_amount_paid,
      total_amount_due,
      remaining_amount,
      registration_fee_paid_amount,
      last_payment_date
    )
    VALUES (
      student_record.student_id,
      student_record.school_id,
      v_total_paid,
      v_discounted_amount,
      v_discounted_amount - v_total_paid,
      v_registration_paid,
      v_last_payment_date
    )
    ON CONFLICT (student_id) DO UPDATE SET
      total_amount_paid = v_total_paid,
      total_amount_due = v_discounted_amount,
      remaining_amount = v_discounted_amount - v_total_paid,
      registration_fee_paid_amount = v_registration_paid,
      last_payment_date = v_last_payment_date,
      updated_at = NOW();
  END LOOP;
END $$;