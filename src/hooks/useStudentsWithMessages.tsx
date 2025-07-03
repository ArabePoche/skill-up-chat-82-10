
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StudentMessage {
  id: string;
  content: string;
  created_at: string;
  lesson_id: string;
  message_type: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
}

interface StudentProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar_url?: string;
}

interface StudentWithMessages {
  id: string;
  user_id: string;
  profiles: StudentProfile | null;
  created_at: string;
  messagesByLesson: {
    [lessonId: string]: StudentMessage[];
  };
  totalMessages: number;
}

export const useStudentsWithMessages = (formationId: string) => {
  return useQuery({
    queryKey: ['students-with-messages', formationId],
    queryFn: async (): Promise<StudentWithMessages[]> => {
      if (!formationId) return [];

      console.log('Fetching students with messages for formation:', formationId);

      // Étape 1: Récupérer les inscriptions approuvées
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollment_requests')
        .select('id, user_id, created_at')
        .eq('formation_id', formationId)
        .eq('status', 'approved');

      console.log('Enrollments query result:', { enrollments, enrollmentsError });

      if (enrollmentsError) {
        console.error('Error fetching enrollments:', enrollmentsError);
        throw enrollmentsError;
      }

      if (!enrollments || enrollments.length === 0) {
        console.log('No approved enrollments found for formation:', formationId);
        return [];
      }

      // Étape 2: Récupérer les profils des utilisateurs
      const userIds = enrollments.map(enrollment => enrollment.user_id);
      console.log('Fetching profiles for user IDs:', userIds);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url')
        .in('id', userIds);

      console.log('Profiles query result:', { profiles, profilesError });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Étape 3: Récupérer tous les messages des élèves pour cette formation
      console.log('Fetching messages for user IDs:', userIds);

      const { data: messages, error: messagesError } = await supabase
        .from('lesson_messages')
        .select('id, content, created_at, lesson_id, sender_id, message_type, file_url, file_name, file_type')
        .eq('formation_id', formationId)
        .in('sender_id', userIds)
        .order('created_at', { ascending: true });

      console.log('Messages query result:', { messages, messagesError });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        throw messagesError;
      }

      // Étape 4: Traiter et combiner les données
      const studentsWithMessages: StudentWithMessages[] = [];

      for (const enrollment of enrollments) {
        const userMessages = messages?.filter(msg => msg.sender_id === enrollment.user_id) || [];
        
        // Exclure les élèves sans messages
        if (userMessages.length === 0) {
          console.log(`Excluding student ${enrollment.user_id} - no messages found`);
          continue;
        }

        // Grouper les messages par leçon
        const messagesByLesson: { [lessonId: string]: StudentMessage[] } = {};
        
        userMessages.forEach(message => {
          if (!messagesByLesson[message.lesson_id]) {
            messagesByLesson[message.lesson_id] = [];
          }
          messagesByLesson[message.lesson_id].push({
            id: message.id,
            content: message.content,
            created_at: message.created_at,
            lesson_id: message.lesson_id,
            message_type: message.message_type,
            file_url: message.file_url,
            file_name: message.file_name,
            file_type: message.file_type
          });
        });

        // Trouver le profil correspondant
        const userProfile = profiles?.find(profile => profile.id === enrollment.user_id);
        let normalizedProfile: StudentProfile | null = null;
        
        if (userProfile) {
          normalizedProfile = {
            id: userProfile.id,
            first_name: userProfile.first_name || undefined,
            last_name: userProfile.last_name || undefined,
            username: userProfile.username || undefined,
            avatar_url: userProfile.avatar_url || undefined,
          };
        }

        studentsWithMessages.push({
          id: enrollment.id,
          user_id: enrollment.user_id,
          profiles: normalizedProfile,
          created_at: enrollment.created_at,
          messagesByLesson,
          totalMessages: userMessages.length
        });
      }

      console.log('Final students with messages:', studentsWithMessages);
      return studentsWithMessages;
    },
    enabled: !!formationId,
  });
};
