
-- Ajouter une colonne pour marquer les messages comme lus par les professeurs
-- Cette colonne stockera les IDs des professeurs qui ont lu le message
ALTER TABLE public.lesson_messages 
ADD COLUMN read_by_teachers UUID[] DEFAULT '{}';

-- Créer un index pour optimiser les requêtes sur les messages lus
CREATE INDEX idx_lesson_messages_read_by_teachers ON public.lesson_messages USING GIN (read_by_teachers);

-- Créer une fonction pour marquer automatiquement les messages comme lus par tous les profs d'une formation
CREATE OR REPLACE FUNCTION public.mark_messages_as_read_by_teachers(
  p_formation_id UUID,
  p_lesson_id UUID,
  p_student_id UUID,
  p_teacher_id UUID
) RETURNS void AS $$
BEGIN
  -- Marquer tous les messages non lus de cette discussion comme lus par tous les profs
  UPDATE public.lesson_messages 
  SET read_by_teachers = COALESCE(read_by_teachers, '{}') || ARRAY[p_teacher_id],
      updated_at = now()
  WHERE formation_id = p_formation_id 
    AND lesson_id = p_lesson_id 
    AND (sender_id = p_student_id OR receiver_id = p_student_id)
    AND NOT (read_by_teachers @> ARRAY[p_teacher_id]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer une fonction pour obtenir le nombre de messages non lus par formation/leçon/étudiant
CREATE OR REPLACE FUNCTION public.get_unread_messages_count(
  p_formation_id UUID,
  p_lesson_id UUID,
  p_student_id UUID,
  p_teacher_id UUID
) RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.lesson_messages 
    WHERE formation_id = p_formation_id 
      AND lesson_id = p_lesson_id 
      AND (sender_id = p_student_id OR receiver_id = p_student_id)
      AND NOT (COALESCE(read_by_teachers, '{}') @> ARRAY[p_teacher_id])
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mettre à jour les politiques RLS pour inclure les nouvelles colonnes
DROP POLICY IF EXISTS "Users can view lesson messages" ON public.lesson_messages;
CREATE POLICY "Users can view lesson messages" 
ON public.lesson_messages FOR SELECT 
USING (
  -- L'utilisateur est l'expéditeur du message
  sender_id = auth.uid()
  OR
  -- L'utilisateur est le destinataire du message  
  receiver_id = auth.uid()
  OR
  -- L'utilisateur est un étudiant inscrit et le message lui est destiné ou vient de lui
  (
    EXISTS (
      SELECT 1 FROM public.enrollment_requests 
      WHERE user_id = auth.uid() 
        AND formation_id = lesson_messages.formation_id 
        AND status = 'approved'
    )
    AND (sender_id = auth.uid() OR receiver_id = auth.uid() OR receiver_id IS NULL)
  )
  OR
  -- L'utilisateur est un professeur de cette formation (accès complet)
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid() AND formation_id = lesson_messages.formation_id
  )
);

-- Politique pour permettre aux professeurs de mettre à jour le statut de lecture
CREATE POLICY "Teachers can update read status" 
ON public.lesson_messages FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid() AND formation_id = lesson_messages.formation_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE user_id = auth.uid() AND formation_id = lesson_messages.formation_id
  )
);
