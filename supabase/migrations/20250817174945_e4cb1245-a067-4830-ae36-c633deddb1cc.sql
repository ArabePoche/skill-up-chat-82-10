-- Corriger les politiques RLS problématiques pour éviter la récursion infinie

-- 1. Supprimer les politiques actuelles de student_promotions qui causent la récursion
DROP POLICY IF EXISTS "Students can view own promotions" ON student_promotions;
DROP POLICY IF EXISTS "Teachers can view promotions" ON student_promotions;
DROP POLICY IF EXISTS "System can manage promotions" ON student_promotions;

-- 2. Créer une fonction sécurisée pour vérifier les promotions
CREATE OR REPLACE FUNCTION public.get_user_promotion_in_formation(p_user_id uuid, p_formation_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT sp.promotion_id 
  FROM student_promotions sp
  JOIN promotions p ON p.id = sp.promotion_id
  WHERE sp.student_id = p_user_id 
    AND p.formation_id = p_formation_id 
    AND sp.is_active = true
  LIMIT 1;
$$;

-- 3. Créer de nouvelles politiques RLS sans récursion
CREATE POLICY "Students can view own promotions secure" 
ON student_promotions FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Teachers can view promotions for their formations secure" 
ON student_promotions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM teachers t
  JOIN teacher_formations tf ON t.id = tf.teacher_id
  JOIN promotions p ON p.formation_id = tf.formation_id
  WHERE t.user_id = auth.uid() AND p.id = student_promotions.promotion_id
));

CREATE POLICY "System can manage promotions secure" 
ON student_promotions FOR ALL
USING (auth.uid() = '4c32c988-3b19-4eca-87cb-0e0595fd7fbb'::uuid)
WITH CHECK (auth.uid() = '4c32c988-3b19-4eca-87cb-0e0595fd7fbb'::uuid);

CREATE POLICY "Admins can manage promotions secure" 
ON student_promotions FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND role = 'admin'::user_role
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND role = 'admin'::user_role
));

-- 4. Mettre à jour la politique des lesson_messages pour supporter les deux types de formations
DROP POLICY IF EXISTS "Users can view lesson messages in both systems" ON lesson_messages;

CREATE POLICY "Users can view lesson messages hybrid system" 
ON lesson_messages FOR SELECT
USING (
  -- Messages système visibles pour tous les participants
  (is_system_message = true AND (
    EXISTS (
      SELECT 1 FROM enrollment_requests er
      WHERE er.user_id = auth.uid() 
        AND er.formation_id = lesson_messages.formation_id 
        AND er.status = 'approved'
    ) OR EXISTS (
      SELECT 1 FROM teachers t
      JOIN teacher_formations tf ON t.id = tf.teacher_id
      WHERE t.user_id = auth.uid() 
        AND tf.formation_id = lesson_messages.formation_id
    )
  ))
  OR
  -- Formation individuelle (pas de promotion_id)
  (promotion_id IS NULL AND (
    sender_id = auth.uid() 
    OR receiver_id = auth.uid() 
    OR (
      -- Professeur peut voir les messages des élèves de sa formation
      sender_id IN (
        SELECT t.user_id FROM teachers t
        JOIN teacher_formations tf ON t.id = tf.teacher_id
        WHERE tf.formation_id = lesson_messages.formation_id
      ) AND EXISTS (
        SELECT 1 FROM enrollment_requests er
        WHERE er.user_id = auth.uid() 
          AND er.formation_id = lesson_messages.formation_id 
          AND er.status = 'approved'
      )
    )
  ))
  OR
  -- Formation de groupe (avec promotion_id)
  (promotion_id IS NOT NULL AND 
    public.get_user_promotion_in_formation(auth.uid(), lesson_messages.formation_id) = lesson_messages.promotion_id
  )
  OR
  -- Professeurs peuvent voir tous les messages de leurs formations
  EXISTS (
    SELECT 1 FROM teachers t
    JOIN teacher_formations tf ON t.id = tf.teacher_id
    WHERE t.user_id = auth.uid() 
      AND tf.formation_id = lesson_messages.formation_id
  )
);
