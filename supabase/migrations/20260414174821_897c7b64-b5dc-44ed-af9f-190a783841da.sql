
-- 1. Corriger le trigger sur school_students_payment
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
  v_student_first_due_month date;
  v_first_due_month date;
  v_school_year_end date;
  v_billable_months integer;
  v_total_school_months integer;
  v_prorated_due numeric;
  v_annual_fee numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_student_id := OLD.student_id;
    v_school_id := OLD.school_id;
  ELSE
    v_student_id := NEW.student_id;
    v_school_id := NEW.school_id;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM school_students_payment WHERE student_id = v_student_id AND payment_type != 'registration';

  SELECT COALESCE(SUM(amount), 0) INTO v_registration_paid
  FROM school_students_payment WHERE student_id = v_student_id AND payment_type = 'registration';

  SELECT s.enrollment_date, s.include_enrollment_month, s.first_due_month,
    COALESCE(c.annual_fee, 0),
    COALESCE(CASE
      WHEN s.discount_percentage IS NOT NULL AND s.discount_percentage > 0 THEN c.annual_fee * (1 - s.discount_percentage / 100)
      WHEN s.discount_amount IS NOT NULL AND s.discount_amount > 0 THEN c.annual_fee - s.discount_amount
      ELSE c.annual_fee END, c.annual_fee, 0)
  INTO v_enrollment_date, v_include_enrollment_month, v_student_first_due_month, v_annual_fee, v_total_due
  FROM students_school s LEFT JOIN classes c ON s.class_id = c.id WHERE s.id = v_student_id;

  SELECT sy.end_date::date INTO v_school_year_end
  FROM students_school s JOIN school_years sy ON s.school_year_id = sy.id WHERE s.id = v_student_id;

  -- Respecter le first_due_month manuel s'il est défini
  IF v_student_first_due_month IS NOT NULL THEN
    v_first_due_month := v_student_first_due_month;
  ELSE
    v_first_due_month := calculate_first_due_month(v_enrollment_date, COALESCE(v_include_enrollment_month, true));
  END IF;

  SELECT calculate_billable_months(sy.start_date::date, sy.end_date::date) INTO v_total_school_months
  FROM students_school s JOIN school_years sy ON s.school_year_id = sy.id WHERE s.id = v_student_id;

  v_billable_months := calculate_billable_months(v_first_due_month, v_school_year_end);

  IF v_total_school_months > 0 THEN
    v_prorated_due := ROUND((v_total_due::numeric / v_total_school_months) * v_billable_months, 0);
  ELSE
    v_prorated_due := v_total_due;
  END IF;

  SELECT MAX(payment_date) INTO v_last_payment_date FROM school_students_payment WHERE student_id = v_student_id;

  INSERT INTO school_student_payment_progress (student_id, school_id, total_amount_paid, registration_fee_paid_amount, total_amount_due, prorated_amount_due, billable_months, last_payment_date, updated_at)
  VALUES (v_student_id, v_school_id, v_total_paid, v_registration_paid, v_total_due, v_prorated_due, v_billable_months, v_last_payment_date, now())
  ON CONFLICT (student_id) DO UPDATE SET
    total_amount_paid = EXCLUDED.total_amount_paid, registration_fee_paid_amount = EXCLUDED.registration_fee_paid_amount,
    total_amount_due = EXCLUDED.total_amount_due, prorated_amount_due = EXCLUDED.prorated_amount_due,
    billable_months = EXCLUDED.billable_months, last_payment_date = EXCLUDED.last_payment_date, updated_at = now();

  RETURN NEW;
END;
$function$;

-- 2. Corriger la fonction de recalcul individuel
CREATE OR REPLACE FUNCTION public.recalculate_student_payment_progress(p_student_id uuid, p_school_id uuid)
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
  v_student_first_due_month date;
  v_first_due_month date;
  v_school_year_end date;
  v_billable_months integer;
  v_total_school_months integer;
  v_prorated_due numeric;
  v_annual_fee numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM school_students_payment WHERE student_id = p_student_id AND payment_type != 'registration';

  SELECT COALESCE(SUM(amount), 0) INTO v_registration_paid
  FROM school_students_payment WHERE student_id = p_student_id AND payment_type = 'registration';

  SELECT s.enrollment_date, s.include_enrollment_month, s.first_due_month,
    COALESCE(c.annual_fee, 0),
    COALESCE(CASE
      WHEN s.discount_percentage IS NOT NULL AND s.discount_percentage > 0 THEN c.annual_fee * (1 - s.discount_percentage / 100)
      WHEN s.discount_amount IS NOT NULL AND s.discount_amount > 0 THEN c.annual_fee - s.discount_amount
      ELSE c.annual_fee END, c.annual_fee, 0)
  INTO v_enrollment_date, v_include_enrollment_month, v_student_first_due_month, v_annual_fee, v_total_due
  FROM students_school s LEFT JOIN classes c ON s.class_id = c.id WHERE s.id = p_student_id;

  SELECT sy.end_date::date INTO v_school_year_end
  FROM students_school s JOIN school_years sy ON s.school_year_id = sy.id WHERE s.id = p_student_id;

  IF v_student_first_due_month IS NOT NULL THEN
    v_first_due_month := v_student_first_due_month;
  ELSE
    v_first_due_month := calculate_first_due_month(COALESCE(v_enrollment_date, CURRENT_DATE), COALESCE(v_include_enrollment_month, true));
  END IF;

  SELECT calculate_billable_months(sy.start_date::date, sy.end_date::date) INTO v_total_school_months
  FROM students_school s JOIN school_years sy ON s.school_year_id = sy.id WHERE s.id = p_student_id;

  v_billable_months := calculate_billable_months(v_first_due_month, COALESCE(v_school_year_end, CURRENT_DATE));

  IF v_total_school_months > 0 THEN
    v_prorated_due := ROUND((v_total_due::numeric / v_total_school_months) * v_billable_months, 0);
  ELSE
    v_prorated_due := v_total_due;
  END IF;

  SELECT MAX(payment_date) INTO v_last_payment_date FROM school_students_payment WHERE student_id = p_student_id;

  INSERT INTO school_student_payment_progress (student_id, school_id, total_amount_paid, registration_fee_paid_amount, total_amount_due, prorated_amount_due, billable_months, last_payment_date, updated_at)
  VALUES (p_student_id, p_school_id, v_total_paid, v_registration_paid, v_total_due, v_prorated_due, v_billable_months, v_last_payment_date, now())
  ON CONFLICT (student_id) DO UPDATE SET
    total_amount_paid = EXCLUDED.total_amount_paid, registration_fee_paid_amount = EXCLUDED.registration_fee_paid_amount,
    total_amount_due = EXCLUDED.total_amount_due, prorated_amount_due = EXCLUDED.prorated_amount_due,
    billable_months = EXCLUDED.billable_months, last_payment_date = EXCLUDED.last_payment_date, updated_at = now();
END;
$function$;

-- 3. Recalculer tous les élèves
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id, school_id FROM students_school LOOP
    PERFORM recalculate_student_payment_progress(r.id, r.school_id);
  END LOOP;
END $$;
