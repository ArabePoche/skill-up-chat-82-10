
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsTeacherInFormation } from '@/hooks/useIsTeacherInFormation';

export const useStudentMessages = (lessonId: string | undefined, formationId: string | undefined) => {
  const { user } = useAuth();
  const { data: isTeacher = false } = useIsTeacherInFormation(formationId);

  return useQuery({
    queryKey: ['student-messages', lessonId, formationId, user?.id, isTeacher],
    queryFn: async () => {
      if (!lessonId || !formationId || !user?.id) return [];

      console.log('Fetching student messages for lesson:', lessonId, 'formation:', formationId, 'user:', user.id, 'isTeacher:', isTeacher);

      if (isTeacher) {
        // Si c'est un professeur dans cette formation, il voit tous les messages
        const { data: messages, error } = await supabase
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
          .eq('lesson_id', lessonId)
          .eq('formation_id', formationId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching teacher messages:', error);
          return [];
        }

        console.log('Teacher messages found:', messages?.length || 0);
        return messages || [];
      } else {
        // Si c'est un étudiant, récupérer d'abord les IDs des professeurs
        const teacherIds = await getTeacherIdsInFormation(formationId);
        
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
          .eq('lesson_id', lessonId)
          .eq('formation_id', formationId);

        // Construire la condition OR pour les messages visibles par l'étudiant
        if (teacherIds.length > 0) {
          query = query.or(`sender_id.eq.${user.id},is_system_message.eq.true,sender_id.in.(${teacherIds.join(',')})`);
        } else {
          query = query.or(`sender_id.eq.${user.id},is_system_message.eq.true`);
        }

        const { data: messages, error } = await query.order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching student messages:', error);
          return [];
        }

        console.log('Student messages found:', messages?.length || 0);
        return messages || [];
      }
    },
    enabled: !!lessonId && !!formationId && !!user?.id,
    refetchInterval: false,
  });
};

// Fonction helper pour récupérer les IDs des professeurs de la formation
async function getTeacherIdsInFormation(formationId: string): Promise<string[]> {
  const { data: teachers } = await supabase
    .from('teachers')
    .select(`
      user_id,
      teacher_formations!inner (
        formation_id
      )
    `)
    .eq('teacher_formations.formation_id', formationId);

  return teachers?.map(t => t.user_id) || [];
}

export const useLessonExercises = (lessonId: string | undefined) => {
  return useQuery({
    queryKey: ['lesson-exercises', lessonId],
    queryFn: async () => {
      if (!lessonId) return [];

      console.log('Fetching exercises for lesson:', lessonId);

      const { data: exercises, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching lesson exercises:', error);
        return [];
      }

      console.log('Lesson exercises found:', exercises?.length || 0);
      return exercises || [];
    },
    enabled: !!lessonId,
    refetchInterval: false,
  });
};
