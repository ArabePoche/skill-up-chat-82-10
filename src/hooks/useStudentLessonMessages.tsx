
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useStudentLessonMessages = (
  formationId: string | undefined, 
  lessonId: string | undefined
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-lesson-messages', formationId, lessonId, user?.id],
    queryFn: async () => {
      if (!formationId || !lessonId || !user?.id) return [];

      console.log('Fetching student messages for:', { formationId, lessonId, studentId: user.id });

      // Vérifier que l'utilisateur est bien inscrit à cette formation
      const { data: enrollmentCheck } = await supabase
        .from('enrollment_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('formation_id', formationId)
        .eq('status', 'approved')
        .single();

      if (!enrollmentCheck) {
        console.error('User is not enrolled in this formation');
        return [];
      }

      // Récupérer les messages où l'étudiant est sender_id, receiver_id, ou messages système
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
    },
    enabled: !!formationId && !!lessonId && !!user?.id,
    refetchInterval: false,
  });
};
