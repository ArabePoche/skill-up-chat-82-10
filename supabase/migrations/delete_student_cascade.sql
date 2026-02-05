-- Créer une fonction SECURITY DEFINER pour supprimer un élève avec ses dépendances
-- Cela contourne les problèmes RLS lors de la suppression en cascade

CREATE OR REPLACE FUNCTION public.delete_student_cascade(p_student_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Supprimer les paiements de l'élève
  DELETE FROM school_students_payment WHERE student_id = p_student_id;
  
  -- Supprimer la progression des paiements
  DELETE FROM school_student_payment_progress WHERE student_id = p_student_id;
  
  -- Supprimer les notes d'enseignants
  DELETE FROM school_teacher_student_notes WHERE student_id = p_student_id;
  
  -- Supprimer l'historique des bulletins
  DELETE FROM school_report_card_history WHERE student_id = p_student_id;
  
  -- Supprimer les exclusions de composition
  DELETE FROM school_composition_excluded_students WHERE student_id = p_student_id;
  
  -- Supprimer les notes de composition
  DELETE FROM school_composition_notes WHERE student_id = p_student_id;
  
  -- Finalement supprimer l'élève
  DELETE FROM students_school WHERE id = p_student_id;
END;
$$;

-- Donner les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.delete_student_cascade(UUID) TO authenticated;