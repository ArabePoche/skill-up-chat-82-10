
-- Ajouter une contrainte unique sur (student_id, school_id)
ALTER TABLE school_student_payment_progress
ADD CONSTRAINT school_student_payment_progress_student_school_key 
UNIQUE (student_id, school_id);

-- Fonction pour recalculer les progrès de paiement d'un élève
CREATE OR REPLACE FUNCTION update_student_payment_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_student_id uuid;
  v_school_id uuid;
  v_total_paid numeric;
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

  -- Calculer le total payé
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM school_students_payment
  WHERE student_id = v_student_id;

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

  -- Date du dernier paiement
  SELECT MAX(payment_date)
  INTO v_last_payment_date
  FROM school_students_payment
  WHERE student_id = v_student_id;

  -- Insérer ou mettre à jour
  INSERT INTO school_student_payment_progress (
    student_id,
    school_id,
    total_amount_paid,
    total_amount_due,
    remaining_amount,
    last_payment_date,
    created_at,
    updated_at
  ) VALUES (
    v_student_id,
    v_school_id,
    v_total_paid,
    v_total_due,
    v_total_due - v_total_paid,
    v_last_payment_date,
    NOW(),
    NOW()
  )
  ON CONFLICT (student_id, school_id)
  DO UPDATE SET
    total_amount_paid = EXCLUDED.total_amount_paid,
    total_amount_due = EXCLUDED.total_amount_due,
    remaining_amount = EXCLUDED.remaining_amount,
    last_payment_date = EXCLUDED.last_payment_date,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur les paiements
DROP TRIGGER IF EXISTS update_payment_progress_on_payment ON school_students_payment;
CREATE TRIGGER update_payment_progress_on_payment
AFTER INSERT OR UPDATE OR DELETE ON school_students_payment
FOR EACH ROW
EXECUTE FUNCTION update_student_payment_progress();

-- Fonction pour mise à jour lors de changement d'élève
CREATE OR REPLACE FUNCTION update_student_payment_progress_on_student_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_student_payment_progress_for_student(NEW.id, NEW.school_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction helper
CREATE OR REPLACE FUNCTION update_student_payment_progress_for_student(
  p_student_id uuid,
  p_school_id uuid
)
RETURNS void AS $$
DECLARE
  v_total_paid numeric;
  v_total_due numeric;
  v_last_payment_date timestamptz;
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM school_students_payment
  WHERE student_id = p_student_id;

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
    last_payment_date,
    created_at,
    updated_at
  ) VALUES (
    p_student_id,
    p_school_id,
    v_total_paid,
    v_total_due,
    v_total_due - v_total_paid,
    v_last_payment_date,
    NOW(),
    NOW()
  )
  ON CONFLICT (student_id, school_id)
  DO UPDATE SET
    total_amount_paid = EXCLUDED.total_amount_paid,
    total_amount_due = EXCLUDED.total_amount_due,
    remaining_amount = EXCLUDED.remaining_amount,
    last_payment_date = EXCLUDED.last_payment_date,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur changement d'élève
DROP TRIGGER IF EXISTS update_payment_progress_on_student_change ON students_school;
CREATE TRIGGER update_payment_progress_on_student_change
AFTER UPDATE OF discount_percentage, discount_amount, class_id ON students_school
FOR EACH ROW
EXECUTE FUNCTION update_student_payment_progress_on_student_change();

-- Recalculer tous les progrès
DO $$
DECLARE
  student_record RECORD;
BEGIN
  FOR student_record IN 
    SELECT id, school_id FROM students_school
  LOOP
    PERFORM update_student_payment_progress_for_student(
      student_record.id,
      student_record.school_id
    );
  END LOOP;
END $$;
