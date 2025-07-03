
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useStudentMessages = (lessonId: string | undefined, formationId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-messages', lessonId, formationId, user?.id],
    queryFn: async () => {
      if (!lessonId || !formationId || !user?.id) return [];

      console.log('Fetching student messages for lesson:', lessonId, 'formation:', formationId, 'user:', user.id);

      // Récupérer SEULEMENT les messages pertinents pour cet étudiant
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
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id},receiver_id.is.null,is_system_message.eq.true`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching student messages:', error);
        return [];
      }

      if (!messages) {
        console.log('No messages found for this student');
        return [];
      }

      console.log('Student messages found:', messages.length);
      return messages;
    },
    enabled: !!lessonId && !!formationId && !!user?.id,
    refetchInterval: false, // Désactiver le polling, on utilise le temps réel
  });
};

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
