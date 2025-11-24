-- Supprimer le constraint existant
ALTER TABLE school_teachers DROP CONSTRAINT school_teachers_teacher_type_check;

-- Mettre à jour les valeurs existantes du français vers l'anglais
UPDATE school_teachers 
SET teacher_type = CASE 
  WHEN teacher_type = 'generaliste' THEN 'generalist'
  WHEN teacher_type = 'specialiste' THEN 'specialist'
  ELSE teacher_type
END;

-- Ajouter le nouveau constraint avec les valeurs en anglais
ALTER TABLE school_teachers ADD CONSTRAINT school_teachers_teacher_type_check 
  CHECK (teacher_type IN ('generalist', 'specialist'));