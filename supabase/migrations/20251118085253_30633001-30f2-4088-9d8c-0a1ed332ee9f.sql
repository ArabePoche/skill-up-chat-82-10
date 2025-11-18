-- Fonction pour initialiser ou mettre à jour les frais de paiement d'un élève
CREATE OR REPLACE FUNCTION initialize_student_payment_progress()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_annual_fee DECIMAL(10,2);
  v_discounted_amount DECIMAL(10,2);
  v_total_paid DECIMAL(10,2);
  v_last_payment_date TIMESTAMP;
BEGIN
  -- Récupérer le tarif annuel de la classe si l'élève a une classe
  IF NEW.class_id IS NOT NULL THEN
    SELECT annual_fee INTO v_annual_fee
    FROM classes
    WHERE id = NEW.class_id;
    
    -- Calculer le montant avec remise appliquée
    v_discounted_amount := calculate_amount_with_discount(
      COALESCE(v_annual_fee, 0),
      NEW.discount_percentage,
      NEW.discount_amount
    );
    
    -- Calculer le total payé existant
    SELECT 
      COALESCE(SUM(amount), 0),
      MAX(payment_date)
    INTO 
      v_total_paid,
      v_last_payment_date
    FROM school_students_payment
    WHERE student_id = NEW.id;
    
    -- Mettre à jour ou créer la progression
    INSERT INTO school_student_payment_progress (
      student_id,
      school_id,
      total_amount_paid,
      total_amount_due,
      remaining_amount,
      last_payment_date
    )
    VALUES (
      NEW.id,
      NEW.school_id,
      v_total_paid,
      v_discounted_amount,
      v_discounted_amount - v_total_paid,
      v_last_payment_date
    )
    ON CONFLICT (student_id) DO UPDATE SET
      total_amount_paid = v_total_paid,
      total_amount_due = v_discounted_amount,
      remaining_amount = v_discounted_amount - v_total_paid,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger sur INSERT et UPDATE de students_school
DROP TRIGGER IF EXISTS trigger_initialize_student_payment ON students_school;
CREATE TRIGGER trigger_initialize_student_payment
AFTER INSERT OR UPDATE OF class_id, discount_percentage, discount_amount
ON students_school
FOR EACH ROW
EXECUTE FUNCTION initialize_student_payment_progress();

-- Initialiser les progrès de paiement pour tous les élèves existants qui n'en ont pas
DO $$
DECLARE
  student_record RECORD;
  v_annual_fee DECIMAL(10,2);
  v_discounted_amount DECIMAL(10,2);
  v_total_paid DECIMAL(10,2);
  v_last_payment_date TIMESTAMP;
BEGIN
  FOR student_record IN 
    SELECT s.id, s.school_id, s.class_id, s.discount_percentage, s.discount_amount
    FROM students_school s
    WHERE s.class_id IS NOT NULL
    AND s.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM school_student_payment_progress p WHERE p.student_id = s.id
    )
  LOOP
    -- Récupérer le tarif annuel
    SELECT annual_fee INTO v_annual_fee
    FROM classes
    WHERE id = student_record.class_id;
    
    -- Calculer le montant avec remise
    v_discounted_amount := calculate_amount_with_discount(
      COALESCE(v_annual_fee, 0),
      student_record.discount_percentage,
      student_record.discount_amount
    );
    
    -- Calculer le total payé
    SELECT 
      COALESCE(SUM(amount), 0),
      MAX(payment_date)
    INTO 
      v_total_paid,
      v_last_payment_date
    FROM school_students_payment
    WHERE student_id = student_record.id;
    
    -- Créer la progression
    INSERT INTO school_student_payment_progress (
      student_id,
      school_id,
      total_amount_paid,
      total_amount_due,
      remaining_amount,
      last_payment_date
    )
    VALUES (
      student_record.id,
      student_record.school_id,
      v_total_paid,
      v_discounted_amount,
      v_discounted_amount - v_total_paid,
      v_last_payment_date
    );
  END LOOP;
END $$;