-- Fonction pour calculer le montant avec remise appliquée
CREATE OR REPLACE FUNCTION calculate_amount_with_discount(
  base_amount DECIMAL,
  discount_percentage DECIMAL,
  discount_amount DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  final_amount DECIMAL;
  discount_applied DECIMAL := 0;
BEGIN
  final_amount := base_amount;
  
  -- Appliquer la remise en pourcentage d'abord
  IF discount_percentage IS NOT NULL AND discount_percentage > 0 THEN
    discount_applied := (base_amount * discount_percentage) / 100;
    final_amount := final_amount - discount_applied;
  END IF;
  
  -- Puis appliquer la remise fixe
  IF discount_amount IS NOT NULL AND discount_amount > 0 THEN
    discount_applied := discount_applied + discount_amount;
    final_amount := final_amount - discount_amount;
  END IF;
  
  -- S'assurer que le montant final n'est pas négatif
  final_amount := GREATEST(0, final_amount);
  
  RETURN final_amount;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Mettre à jour la fonction de calcul des progrès de paiement pour inclure la remise
CREATE OR REPLACE FUNCTION update_school_student_payment_progress()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_annual_fee DECIMAL(10,2);
  v_discount_percentage DECIMAL(5,2);
  v_discount_amount DECIMAL(10,2);
  v_discounted_amount DECIMAL(10,2);
  v_total_paid DECIMAL(10,2);
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
  JOIN classes c ON s.class_id = c.id
  WHERE s.id = NEW.student_id;

  -- Calculer le montant avec remise appliquée
  v_discounted_amount := calculate_amount_with_discount(
    COALESCE(v_annual_fee, 0),
    v_discount_percentage,
    v_discount_amount
  );

  -- Calculer le total payé
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM school_students_payment
  WHERE student_id = NEW.student_id;

  -- Mettre à jour ou créer la progression avec le montant après remise
  INSERT INTO school_student_payment_progress (
    student_id,
    school_id,
    total_amount_paid,
    total_amount_due,
    remaining_amount,
    last_payment_date
  )
  VALUES (
    NEW.student_id,
    NEW.school_id,
    v_total_paid,
    v_discounted_amount,
    v_discounted_amount - v_total_paid,
    NEW.payment_date
  )
  ON CONFLICT (student_id) DO UPDATE SET
    total_amount_paid = v_total_paid,
    total_amount_due = v_discounted_amount,
    remaining_amount = v_discounted_amount - v_total_paid,
    last_payment_date = NEW.payment_date,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Recalculer tous les progrès de paiement existants pour appliquer les remises
DO $$
DECLARE
  student_record RECORD;
  v_annual_fee DECIMAL(10,2);
  v_discount_percentage DECIMAL(5,2);
  v_discount_amount DECIMAL(10,2);
  v_discounted_amount DECIMAL(10,2);
  v_total_paid DECIMAL(10,2);
  v_last_payment_date TIMESTAMP;
BEGIN
  FOR student_record IN 
    SELECT DISTINCT s.id, s.school_id, s.discount_percentage, s.discount_amount, c.annual_fee
    FROM students_school s
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE s.status = 'active'
  LOOP
    -- Calculer le montant avec remise
    v_discounted_amount := calculate_amount_with_discount(
      COALESCE(student_record.annual_fee, 0),
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
    
    -- Mettre à jour la progression
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
    )
    ON CONFLICT (student_id) DO UPDATE SET
      total_amount_paid = v_total_paid,
      total_amount_due = v_discounted_amount,
      remaining_amount = v_discounted_amount - v_total_paid,
      last_payment_date = v_last_payment_date,
      updated_at = now();
  END LOOP;
END;
$$;