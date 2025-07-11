
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsTeacherInFormation } from '@/hooks/useIsTeacherInFormation';

export const useStudentLessonMessages = (
  formationId: string | undefined, 
  lessonId: string | undefined
) => {
  const { user } = useAuth();
  const { data: isTeacher = false } = useIsTeacherInFormation(formationId);

  return useQuery({
    queryKey: ['student-lesson-messages', formationId, lessonId, user?.id, isTeacher],
    queryFn: async () => {
      if (!formationId || !lessonId || !user?.id) return [];

      console.log('Fetching messages for:', { 
        formationId, 
        lessonId, 
        studentId: user.id,
        isTeacher 
      });

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
          .eq('formation_id', formationId)
          .eq('lesson_id', lessonId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching teacher messages:', error);
          return [];
        }

        console.log('Teacher messages found:', messages?.length || 0);
        return messages || [];
      } else {
        // Si c'est un étudiant, il ne voit que :
        // 1. Ses propres messages (sender_id = user.id)
        // 2. Les messages qui lui sont adressés (receiver_id = user.id)
        // 3. Les messages système (is_system_message = true)
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
          .eq('formation_id', formationId)
          .eq('lesson_id', lessonId)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id},is_system_message.eq.true`)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching student messages:', error);
          return [];
        }

        console.log('Student messages found:', messages?.length || 0);
        return messages || [];
      }
    },
    enabled: !!formationId && !!lessonId && !!user?.id,
    refetchInterval: false,
  });
};
