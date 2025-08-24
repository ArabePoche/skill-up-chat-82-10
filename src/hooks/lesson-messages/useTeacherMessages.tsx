
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook pour récupérer tous les messages en tant que professeur
 */
export const useTeacherMessages = (lessonId: string | undefined, formationId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teacher-messages', lessonId, formationId, user?.id],
    queryFn: async () => {
      if (!lessonId || !formationId || !user?.id) return [];

      console.log('Fetching teacher messages:', { lessonId, formationId, userId: user.id });

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
          ),
          replied_to_message:replied_to_message_id(
            id,
            content,
            sender_id,
            profiles!sender_id(
              id,
              first_name,
              last_name,
              username
            )
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
    },
    enabled: !!lessonId && !!formationId && !!user?.id,
    refetchInterval: false,
  });
};
