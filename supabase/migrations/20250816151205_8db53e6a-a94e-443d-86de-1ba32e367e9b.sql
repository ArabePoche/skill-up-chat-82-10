-- Corriger la politique RLS pour permettre aux élèves de voir leurs messages dans les deux systèmes
DROP POLICY IF EXISTS "Users can view lesson messages in their promotion" ON lesson_messages;

CREATE POLICY "Users can view lesson messages in both systems" ON lesson_messages
FOR SELECT USING (
  -- 1. Messages système visibles pour tous les élèves inscrits
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
  -- 2. SYSTÈME INDIVIDUEL : Messages sans promotion (NULL) - visible pour élève inscrit
  (promotion_id IS NULL AND (
    -- Ses propres messages
    sender_id = auth.uid()
    OR
    -- Messages qui lui sont adressés directement
    receiver_id = auth.uid()
    OR
    -- Messages des professeurs de sa formation (si il est inscrit)
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
  ))
  OR
  -- 3. SYSTÈME GROUPE : Messages avec promotion - visible pour membres de la promotion
  (promotion_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM student_promotions sp
    WHERE sp.promotion_id = lesson_messages.promotion_id 
      AND sp.student_id = auth.uid()
      AND sp.is_active = true
  ))
  OR
  -- 4. Professeurs peuvent voir tous les messages de leurs formations
  EXISTS (
    SELECT 1 FROM teachers t
    JOIN teacher_formations tf ON t.id = tf.teacher_id
    WHERE t.user_id = auth.uid() AND tf.formation_id = lesson_messages.formation_id
  )
);