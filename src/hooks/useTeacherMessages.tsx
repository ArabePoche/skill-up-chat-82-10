
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useTeacherMessages = (lessonId: string | undefined, formationId: string | undefined) => {
  return useQuery({
    queryKey: ['teacher-messages', lessonId, formationId],
    queryFn: async () => {
      if (!lessonId || !formationId) return [];

      console.log('Fetching teacher messages for lesson:', lessonId, 'formation:', formationId);

      // Récupérer tous les messages de la leçon (accès professeur)
      const { data: messages, error } = await supabase
        .from('lesson_messages')
        .select(`
          *,
          sender_profile:profiles!sender_id(
            id,
            first_name,
            last_name,
            username,
            avatar_url
          )
        `)
        .eq('lesson_id', lessonId)
        .eq('formation_id', formationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching teacher messages:', error);
        return [];
      }

      // Transformer les données pour correspondre à l'interface Message attendue
      const messagesWithProfiles = messages?.map(msg => ({
        ...msg,
        profiles: msg.sender_profile
      })) || [];

      console.log('Fetched teacher messages with profiles:', messagesWithProfiles);
      return messagesWithProfiles;
    },
    enabled: !!lessonId && !!formationId,
  });
};
