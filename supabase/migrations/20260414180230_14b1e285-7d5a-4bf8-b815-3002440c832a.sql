
-- Mettre à jour first_due_month de novembre à octobre
UPDATE students_school 
SET first_due_month = '2025-10-01'
WHERE first_due_month = '2025-11-01';

-- Mettre à jour enrollment_date : remplacer le mois 11 par 10 en gardant le jour
UPDATE students_school 
SET enrollment_date = (enrollment_date - INTERVAL '1 month')::date
WHERE first_due_month = '2025-10-01'
  AND EXTRACT(MONTH FROM enrollment_date) = 11
  AND EXTRACT(YEAR FROM enrollment_date) = 2025;
