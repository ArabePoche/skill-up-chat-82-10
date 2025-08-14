
-- Créer la table des promotions (groupes d'élèves)
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  formation_id UUID REFERENCES formations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Créer la table pour associer les élèves aux promotions
CREATE TABLE public.student_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(student_id, promotion_id)
);

-- Mettre à jour la table lesson_messages pour inclure la promotion
ALTER TABLE public.lesson_messages 
ADD COLUMN promotion_id UUID REFERENCES promotions(id);

-- Créer un index pour optimiser les requêtes de messages par promotion
CREATE INDEX idx_lesson_messages_promotion_lesson ON lesson_messages(promotion_id, lesson_id);

-- Activer RLS sur les nouvelles tables
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_promotions ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour promotions
CREATE POLICY "Admins can manage all promotions" ON promotions
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Teachers can view promotions for their formations" ON promotions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM teachers t
    JOIN teacher_formations tf ON t.id = tf.teacher_id
    WHERE t.user_id = auth.uid() AND tf.formation_id = promotions.formation_id
  )
);

CREATE POLICY "Students can view their promotions" ON promotions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM student_promotions sp
    WHERE sp.promotion_id = promotions.id AND sp.student_id = auth.uid()
  )
);

-- Politiques RLS pour student_promotions
CREATE POLICY "Admins can manage all student promotions" ON student_promotions
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Teachers can view student promotions for their formations" ON student_promotions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM teachers t
    JOIN teacher_formations tf ON t.id = tf.teacher_id
    JOIN promotions p ON p.formation_id = tf.formation_id
    WHERE t.user_id = auth.uid() AND p.id = student_promotions.promotion_id
  )
);

CREATE POLICY "Students can view their own promotion memberships" ON student_promotions
FOR SELECT USING (student_id = auth.uid());

-- Mettre à jour les politiques de lesson_messages pour inclure la logique de promotion
DROP POLICY IF EXISTS "Users can view lesson messages" ON lesson_messages;

CREATE POLICY "Users can view lesson messages in their promotion" ON lesson_messages
FOR SELECT USING (
  -- Messages système visibles pour tous dans la formation
  (is_system_message = true AND (
    EXISTS (
      SELECT 1 FROM enrollment_requests er
      WHERE er.user_id = auth.uid() 
        AND er.formation_id = lesson_messages.formation_id 
        AND er.status = 'approved'
    )
    OR EXISTS (
      SELECT 1 FROM teachers t
      JOIN teacher_formations tf ON t.id = tf.teacher_id
      WHERE t.user_id = auth.uid() AND tf.formation_id = lesson_messages.formation_id
    )
  ))
  OR
  -- Messages dans la même promotion
  (promotion_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM student_promotions sp
    WHERE sp.promotion_id = lesson_messages.promotion_id 
      AND sp.student_id = auth.uid()
      AND sp.is_active = true
  ))
  OR
  -- Messages des professeurs visibles pour les élèves de leur formation
  (sender_id IN (
    SELECT t.user_id FROM teachers t
    JOIN teacher_formations tf ON t.id = tf.teacher_id
    WHERE tf.formation_id = lesson_messages.formation_id
  ) AND EXISTS (
    SELECT 1 FROM enrollment_requests er
    WHERE er.user_id = auth.uid() 
      AND er.formation_id = lesson_messages.formation_id 
      AND er.status = 'approved'
  ))
  OR
  -- Ses propres messages
  sender_id = auth.uid()
  OR
  -- Messages qui lui sont adressés
  receiver_id = auth.uid()
  OR
  -- Professeurs peuvent voir tous les messages de leur formation
  EXISTS (
    SELECT 1 FROM teachers t
    JOIN teacher_formations tf ON t.id = tf.teacher_id
    WHERE t.user_id = auth.uid() AND tf.formation_id = lesson_messages.formation_id
  )
);

-- Fonction pour obtenir la promotion d'un étudiant dans une formation
CREATE OR REPLACE FUNCTION get_student_promotion(p_student_id UUID, p_formation_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  promotion_id UUID;
BEGIN
  SELECT sp.promotion_id INTO promotion_id
  FROM student_promotions sp
  JOIN promotions p ON p.id = sp.promotion_id
  WHERE sp.student_id = p_student_id 
    AND p.formation_id = p_formation_id
    AND sp.is_active = true
  LIMIT 1;
  
  RETURN promotion_id;
END;
$$;

-- Fonction pour vérifier si un étudiant peut voir une leçon (selon sa progression)
CREATE OR REPLACE FUNCTION can_student_access_lesson(p_student_id UUID, p_lesson_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lesson_unlocked BOOLEAN := false;
BEGIN
  -- Vérifier si la leçon est débloquée dans user_lesson_progress
  SELECT EXISTS (
    SELECT 1 FROM user_lesson_progress ulp
    WHERE ulp.user_id = p_student_id 
      AND ulp.lesson_id = p_lesson_id
      AND ulp.status IN ('not_started', 'in_progress', 'awaiting_review', 'completed')
  ) INTO lesson_unlocked;
  
  RETURN lesson_unlocked;
END;
$$;

-- Mettre à jour la fonction validate_exercise_submission pour inclure la promotion
CREATE OR REPLACE FUNCTION validate_exercise_submission_with_promotion(
  p_message_id UUID, 
  p_user_id UUID, 
  p_is_valid BOOLEAN, 
  p_reject_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exercise_id UUID;
  v_lesson_id UUID;
  v_formation_id UUID;
  v_promotion_id UUID;
  v_all_exercises UUID[];
  v_index INT;
  v_next_exercise_id UUID;
  v_next_exercise_title TEXT;
  v_current_level_id UUID;
  v_next_lesson_id UUID;
  v_next_lesson_title TEXT;
  v_first_exercise_next_lesson UUID;
  v_total_exercises INT;
  v_approved_exercises INT;
  SYSTEM_USER_ID CONSTANT UUID := '4c32c988-3b19-4eca-87cb-0e0595fd7fbb';
BEGIN
  -- Récupération des infos du message
  SELECT lm.exercise_id, lm.lesson_id, lm.formation_id, lm.promotion_id
  INTO v_exercise_id, v_lesson_id, v_formation_id, v_promotion_id
  FROM lesson_messages lm
  WHERE lm.id = p_message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message introuvable';
  END IF;

  -- Obtenir la promotion de l'étudiant si pas déjà définie
  IF v_promotion_id IS NULL THEN
    v_promotion_id := get_student_promotion(p_user_id, v_formation_id);
  END IF;

  IF p_is_valid THEN
    -- Valider le message
    UPDATE lesson_messages
    SET exercise_status = 'approved'
    WHERE id = p_message_id;

    -- Tous les exercices de la leçon
    SELECT array_agg(e.id ORDER BY e.created_at), COUNT(*)
    INTO v_all_exercises, v_total_exercises
    FROM exercises e
    WHERE e.lesson_id = v_lesson_id;

    -- Exercices déjà validés pour cet étudiant
    SELECT COUNT(DISTINCT lm.exercise_id)
    INTO v_approved_exercises
    FROM lesson_messages lm
    WHERE lm.lesson_id = v_lesson_id
      AND lm.sender_id = p_user_id
      AND lm.is_exercise_submission = true
      AND lm.exercise_status = 'approved'
      AND lm.exercise_id IS NOT NULL;

    -- Trouver la position de l'exercice actuel
    SELECT i INTO v_index
    FROM generate_subscripts(v_all_exercises, 1) AS i
    WHERE v_all_exercises[i] = v_exercise_id;

    -- Si un autre exercice suit dans la même leçon
    IF v_index IS NOT NULL AND v_index < array_length(v_all_exercises, 1) THEN
      v_next_exercise_id := v_all_exercises[v_index + 1];

      SELECT title INTO v_next_exercise_title
      FROM exercises
      WHERE id = v_next_exercise_id;

      INSERT INTO lesson_messages (
        lesson_id, formation_id, promotion_id, sender_id, receiver_id,
        content, message_type, is_system_message, exercise_id
      ) VALUES (
        v_lesson_id, v_formation_id, v_promotion_id, SYSTEM_USER_ID, p_user_id,
        '✅ Bien joué ! Voici ton prochain exercice : ' || COALESCE(v_next_exercise_title, 'Exercice suivant'),
        'system', true, v_next_exercise_id
      );

    -- Si tous les exercices sont terminés
    ELSIF v_approved_exercises >= v_total_exercises THEN
      UPDATE user_lesson_progress
      SET status = 'completed', exercise_completed = true, completed_at = now()
      WHERE user_id = p_user_id AND lesson_id = v_lesson_id;

      -- Trouver le niveau actuel
      SELECT l.level_id INTO v_current_level_id
      FROM lessons l
      WHERE l.id = v_lesson_id;

      -- Trouver la prochaine leçon dans le même niveau
      SELECT l.id, l.title INTO v_next_lesson_id, v_next_lesson_title
      FROM lessons l
      WHERE l.level_id = v_current_level_id
        AND l.order_index > (
          SELECT order_index FROM lessons WHERE id = v_lesson_id
        )
      ORDER BY l.order_index
      LIMIT 1;

      -- Message de félicitation dans la leçon actuelle
      INSERT INTO lesson_messages (
        lesson_id, formation_id, promotion_id, sender_id, receiver_id,
        content, message_type, is_system_message
      ) VALUES (
        v_lesson_id, v_formation_id, v_promotion_id, SYSTEM_USER_ID, p_user_id,
        '🎉 Félicitations ! Vous avez terminé cette leçon avec succès ! 🎉',
        'system', true
      );

      -- Si prochaine leçon existe dans le même niveau
      IF v_next_lesson_id IS NOT NULL THEN
        INSERT INTO user_lesson_progress (user_id, lesson_id, status, exercise_completed)
        VALUES (p_user_id, v_next_lesson_id, 'not_started', false)
        ON CONFLICT (user_id, lesson_id) DO NOTHING;

        -- Premier exercice de la prochaine leçon
        SELECT e.id INTO v_first_exercise_next_lesson
        FROM exercises e
        WHERE e.lesson_id = v_next_lesson_id
        ORDER BY e.created_at
        LIMIT 1;

        -- Message de bienvenue dans la nouvelle leçon avec promotion
        IF v_first_exercise_next_lesson IS NOT NULL THEN
          INSERT INTO lesson_messages (
            lesson_id, formation_id, promotion_id, sender_id, receiver_id,
            content, message_type, is_system_message, exercise_id
          ) VALUES (
            v_next_lesson_id, v_formation_id, v_promotion_id, SYSTEM_USER_ID, p_user_id,
            '👋 Bienvenue dans cette nouvelle leçon ! Voici votre premier exercice :',
            'system', true, v_first_exercise_next_lesson
          );
        END IF;
      END IF;
    END IF;

  ELSE
    -- Marquer l'exercice comme rejeté
    UPDATE lesson_messages
    SET exercise_status = 'rejected',
        content = '❌ Exercice rejeté. Raison : ' || COALESCE(p_reject_reason, 'Non spécifiée')
    WHERE id = p_message_id;

    -- Réinitialiser la leçon
    UPDATE user_lesson_progress
    SET status = 'in_progress', exercise_completed = false
    WHERE user_id = p_user_id AND lesson_id = v_lesson_id;
  END IF;
END;
$$;
