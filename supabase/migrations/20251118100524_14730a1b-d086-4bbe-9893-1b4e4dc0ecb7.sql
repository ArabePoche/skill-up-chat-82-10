
-- Migration pour initialiser les montants dus des élèves existants
-- et créer un trigger pour maintenir la synchronisation

-- 1. Créer une fonction pour recalculer le montant dû d'un élève
CREATE OR REPLACE FUNCTION recalculate_student_amount_due(student_row students_school)
RETURNS numeric AS $$
DECLARE
  class_fee numeric;
  calculated_amount numeric;
BEGIN
  -- Récupérer les frais annuels de la classe
  SELECT COALESCE(annual_fee, 0) INTO class_fee
  FROM classes
  WHERE id = student_row.class_id;
  
  -- Calculer le montant avec remise
  calculated_amount := calculate_amount_with_discount(
    class_fee,
    student_row.discount_percentage,
    student_row.discount_amount
  );
  
  RETURN calculated_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Mettre à jour tous les élèves existants avec le bon montant
-- On met à jour uniquement ceux qui ont total_amount_due = 0 et qui devraient avoir un montant
UPDATE school_student_payment_progress sp
SET total_amount_due = (
  SELECT recalculate_student_amount_due(s.*)
  FROM students_school s
  WHERE s.id = sp.student_id
)
WHERE sp.total_amount_due = 0
  AND EXISTS (
    SELECT 1 FROM students_school s
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = sp.student_id
      AND c.annual_fee > 0
      -- Ne pas mettre à jour si l'élève a une remise totale
      AND NOT (s.discount_amount >= c.annual_fee)
  );

-- 3. Recalculer le remaining_amount après mise à jour
UPDATE school_student_payment_progress
SET remaining_amount = total_amount_due - total_amount_paid
WHERE remaining_amount != (total_amount_due - total_amount_paid);

-- 4. Créer un trigger pour mettre à jour automatiquement quand une classe change ses frais
CREATE OR REPLACE FUNCTION trigger_update_students_on_class_fee_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Si les frais annuels de la classe changent, recalculer pour tous les élèves
  IF (NEW.annual_fee IS DISTINCT FROM OLD.annual_fee) THEN
    UPDATE school_student_payment_progress sp
    SET total_amount_due = (
      SELECT recalculate_student_amount_due(s.*)
      FROM students_school s
      WHERE s.id = sp.student_id
    ),
    remaining_amount = (
      SELECT recalculate_student_amount_due(s.*) - sp.total_amount_paid
      FROM students_school s
      WHERE s.id = sp.student_id
    )
    WHERE sp.student_id IN (
      SELECT id FROM students_school WHERE class_id = NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_students_on_class_fee_change ON classes;
CREATE TRIGGER update_students_on_class_fee_change
  AFTER UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_students_on_class_fee_change();

-- 5. Créer un trigger pour mettre à jour quand la remise d'un élève change
CREATE OR REPLACE FUNCTION trigger_update_student_amount_on_discount_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la remise change, recalculer le montant dû
  IF (NEW.discount_percentage IS DISTINCT FROM OLD.discount_percentage) 
     OR (NEW.discount_amount IS DISTINCT FROM OLD.discount_amount)
     OR (NEW.class_id IS DISTINCT FROM OLD.class_id) THEN
    
    UPDATE school_student_payment_progress
    SET total_amount_due = recalculate_student_amount_due(NEW.*),
        remaining_amount = recalculate_student_amount_due(NEW.*) - total_amount_paid
    WHERE student_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_student_amount_on_discount_change ON students_school;
CREATE TRIGGER update_student_amount_on_discount_change
  AFTER UPDATE ON students_school
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_student_amount_on_discount_change();
