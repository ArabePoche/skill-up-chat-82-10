
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook pour récupérer les messages individuels (sans promotion)
 */
export const useIndividualMessages = (lessonId: string | undefined, formationId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['individual-messages', lessonId, formationId, user?.id],
    queryFn: async () => {
      if (!lessonId || !formationId || !user?.id) return [];

      console.log('Fetching individual messages:', { lessonId, formationId, userId: user.id });

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
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id},is_system_message.eq.true`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching individual messages:', error);
        return [];
      }

      console.log('Individual messages found:', messages?.length || 0);
      return messages || [];
    },
    enabled: !!lessonId && !!formationId && !!user?.id,
    refetchInterval: false,
  });
};
