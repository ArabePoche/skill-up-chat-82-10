-- Corriger la fonction de recalcul lors de la suppression de paiement
-- Le problème : la fonction utilise ON CONFLICT (student_id, school_id)
-- alors que la contrainte unique est seulement sur (student_id)

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

  -- Calculer le total payé après suppression
  SELECT 
    COALESCE(SUM(amount), 0),
    MAX(payment_date)
  INTO 
    v_total_paid,
    v_last_payment_date
  FROM school_students_payment
  WHERE student_id = OLD.student_id;

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
    OLD.student_id,
    OLD.school_id,
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
    updated_at = NOW();

  RETURN OLD;
END;
$function$;