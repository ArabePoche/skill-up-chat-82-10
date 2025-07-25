
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useTeacherStudentMessages = (
  formationId: string | undefined, 
  studentId: string | undefined,
  lessonId?: string | undefined
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teacher-student-messages', formationId, studentId, lessonId, user?.id],
    queryFn: async () => {
      if (!formationId || !studentId || !user?.id) return [];

      console.log('Fetching teacher-student messages for:', { formationId, studentId, lessonId, teacherId: user.id });

      // Vérifier que l'utilisateur est bien professeur de cette formation via teacher_formations
      const { data: teacherCheck } = await supabase
        .from('teachers')
        .select(`
          id,
          teacher_formations!inner (
            formation_id
          )
        `)
        .eq('user_id', user.id)
        .eq('teacher_formations.formation_id', formationId)
        .single();

      if (!teacherCheck) {
        console.error('User is not a teacher for this formation');
        return [];
      }

      // Construire la requête - professeur peut voir tous les messages de cet étudiant
      let query = supabase
        .from('lesson_messages')
        .select(`
          *,
          profiles!sender_id(
            id,
            first_name,
            last_name,
            username,
            avatar_url,
            is_teacher
          )
        `)
        .eq('formation_id', formationId)
        .or(`sender_id.eq.${studentId},receiver_id.eq.${studentId},is_system_message.eq.true`);

      // Si lessonId est fourni, filtrer par cette leçon spécifique
      if (lessonId) {
        query = query.eq('lesson_id', lessonId);
        console.log('Filtering messages by lesson_id:', lessonId);
      }

      const { data: messages, error } = await query.order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching teacher-student messages:', error);
        return [];
      }

      console.log('Teacher-student messages found:', messages?.length || 0);
      return messages || [];
    },
    enabled: !!formationId && !!studentId && !!user?.id,
    refetchInterval: false, // Désactiver le polling, on utilise le temps réel
  });
};
