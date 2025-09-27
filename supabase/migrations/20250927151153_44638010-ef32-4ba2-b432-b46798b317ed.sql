-- Vérifier et corriger les politiques RLS pour s'assurer qu'elles utilisent teachers.id et non user_id directement

-- 1. Supprimer les anciennes politiques et en créer de nouvelles
DROP POLICY IF EXISTS "Teachers can view their formations" ON teacher_formations;
DROP POLICY IF EXISTS "Teachers can be assigned to formations" ON teacher_formations;
DROP POLICY IF EXISTS "Admins can manage teacher formations" ON teacher_formations;

-- Créer les nouvelles politiques correctes
CREATE POLICY "Teachers can view their formations" 
ON teacher_formations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM teachers 
    WHERE teachers.id = teacher_formations.teacher_id 
    AND teachers.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage teacher formations" 
ON teacher_formations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 2. Créer ou remplacer la fonction pour vérifier correctement les formations d'un professeur
CREATE OR REPLACE FUNCTION public.get_teacher_formations(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tf.formation_id
  FROM teachers t
  JOIN teacher_formations tf ON t.id = tf.teacher_id
  WHERE t.user_id = p_user_id;
$$;

-- 3. Vérifier la fonction is_teacher_of_formation pour qu'elle utilise la bonne logique
CREATE OR REPLACE FUNCTION public.is_teacher_of_formation(p_user_id UUID, p_formation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM teachers t
    JOIN teacher_formations tf ON t.id = tf.teacher_id
    WHERE t.user_id = p_user_id 
      AND tf.formation_id = p_formation_id
  );
$$;

-- 4. Mettre à jour can_user_manage_promotions pour utiliser la bonne logique
CREATE OR REPLACE FUNCTION public.can_user_manage_promotions(p_formation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM teachers t
    JOIN teacher_formations tf ON t.id = tf.teacher_id
    WHERE t.user_id = auth.uid() AND tf.formation_id = p_formation_id
  );
$$;