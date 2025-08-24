-- Modifier la colonne read_by_teachers en read_by_teacher (un seul UUID au lieu d'un tableau)
ALTER TABLE lesson_messages 
DROP COLUMN IF EXISTS read_by_teachers;

ALTER TABLE lesson_messages 
ADD COLUMN IF NOT EXISTS read_by_teacher UUID DEFAULT NULL;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_lesson_messages_read_by_teacher 
ON lesson_messages(read_by_teacher);

-- Mettre à jour la fonction pour marquer les messages comme lus par un professeur
CREATE OR REPLACE FUNCTION public.mark_messages_as_read_by_teacher(
  p_formation_id uuid, 
  p_lesson_id uuid, 
  p_student_id uuid, 
  p_teacher_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Vérifier que l'utilisateur est bien professeur de cette formation
  IF NOT EXISTS (
    SELECT 1 FROM teachers t
    JOIN teacher_formations tf ON t.id = tf.teacher_id
    WHERE t.user_id = p_teacher_id AND tf.formation_id = p_formation_id
  ) THEN
    RAISE EXCEPTION 'User is not a teacher for this formation';
  END IF;

  -- Marquer tous les messages non lus de cette discussion avec l'ID du professeur
  UPDATE lesson_messages 
  SET read_by_teacher = p_teacher_id,
      is_read = true,
      updated_at = now()
  WHERE formation_id = p_formation_id 
    AND lesson_id = p_lesson_id 
    AND (sender_id = p_student_id OR receiver_id = p_student_id)
    AND read_by_teacher IS NULL  -- Seulement les messages non lus par un prof
    AND is_system_message = false;
    
  RAISE NOTICE 'Messages marked as read by teacher: %', p_teacher_id;
END;
$function$;

-- Mettre à jour la fonction de comptage des messages non lus
CREATE OR REPLACE FUNCTION public.get_unread_messages_count(
  p_formation_id uuid, 
  p_lesson_id uuid, 
  p_student_id uuid, 
  p_teacher_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Vérifier que l'utilisateur est bien professeur de cette formation
  IF NOT EXISTS (
    SELECT 1 FROM teachers t
    JOIN teacher_formations tf ON t.id = tf.teacher_id
    WHERE t.user_id = p_teacher_id AND tf.formation_id = p_formation_id
  ) THEN
    RETURN 0;
  END IF;

  -- Compter les messages où read_by_teacher est NULL (non lus par aucun prof)
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM lesson_messages 
    WHERE formation_id = p_formation_id 
      AND lesson_id = p_lesson_id 
      AND sender_id = p_student_id
      AND read_by_teacher IS NULL  -- Non lu par aucun professeur
      AND is_system_message = false
  );
END;
$function$;

-- Mettre à jour la fonction pour obtenir le comptage total des messages non lus d'une formation
CREATE OR REPLACE FUNCTION public.get_formation_unread_count(
  p_formation_id uuid, 
  p_teacher_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Vérifier que l'utilisateur est bien professeur de cette formation
  IF NOT EXISTS (
    SELECT 1 FROM teachers t
    JOIN teacher_formations tf ON t.id = tf.teacher_id
    WHERE t.user_id = p_teacher_id AND tf.formation_id = p_formation_id
  ) THEN
    RETURN 0;
  END IF;

  -- Compter tous les messages où read_by_teacher est NULL
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM lesson_messages lm
    WHERE lm.formation_id = p_formation_id 
      AND lm.read_by_teacher IS NULL  -- Non lu par aucun professeur
      AND lm.is_system_message = false
      AND EXISTS (
        SELECT 1 FROM enrollment_requests er 
        WHERE er.user_id = lm.sender_id 
          AND er.formation_id = p_formation_id 
          AND er.status = 'approved'
      )
  );
END;
$function$;