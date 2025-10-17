
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const SYSTEM_USER_ID = '4c32c988-3b19-4eca-87cb-0e0595fd7fbb';

export const useConversations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['conversations', user?.id],
    refetchInterval: 5000, // Rafraîchir toutes les 5 secondes
    queryFn: async () => {
      if (!user?.id) return [];

      // Récupérer les formations où l'utilisateur est enseignant ou étudiant
      const [teacherFormations, studentEnrollments] = await Promise.all([
        supabase
          .from('teachers')
          .select(`
            id,
            teacher_formations!inner (
              formation_id,
              formations (
                id,
                title,
                description,
                created_at
              )
            )
          `)
          .eq('user_id', user.id),
        
        supabase
          .from('enrollment_requests')
          .select(`
            formation_id,
            formations:formation_id (
              id,
              title,
              description,
              profiles:author_id (
                first_name,
                last_name,
                username
              )
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'approved')
      ]);

      const conversations = [];

      // Ajouter les conversations des formations où l'utilisateur est enseignant
      if (teacherFormations.data) {
        for (const teacher of teacherFormations.data) {
          for (const tf of teacher.teacher_formations) {
            if (tf.formations) {
              // Compter les messages non lus pour les profs
              const { data: unreadMessages } = await supabase
                .from('lesson_messages')
                .select('id', { count: 'exact' })
                .eq('formation_id', tf.formations.id)
                .is('read_by_teachers', null)
                .neq('sender_id', user.id)
                .eq('is_system_message', false);

              conversations.push({
                id: `teacher-${tf.formations.id}`,
                name: `${tf.formations.title} - Groupe`,
                lastMessage: 'Formation dont vous êtes professeur',
                timestamp: 'Aujourd\'hui',
                created_at: tf.formations.created_at || new Date().toISOString(),
                unread: unreadMessages?.length || 0,
                avatar: '👨‍🏫',
                online: false,
                type: 'formation_teacher',
                formationId: tf.formations.id
              });
            }
          }
        }
      }

      // Ajouter les conversations des formations où l'utilisateur est étudiant
      if (studentEnrollments.data) {
        // Récupérer les dates d'inscription
        const { data: enrollmentDates } = await supabase
          .from('enrollment_requests')
          .select('formation_id, created_at')
          .eq('user_id', user.id)
          .eq('status', 'approved');

        const enrollmentDatesMap = new Map(
          enrollmentDates?.map(e => [e.formation_id, e.created_at]) || []
        );

        for (const enrollment of studentEnrollments.data) {
          if (enrollment.formations) {
            const authorName = enrollment.formations.profiles 
              ? `${enrollment.formations.profiles.first_name || ''} ${enrollment.formations.profiles.last_name || ''}`.trim() || enrollment.formations.profiles.username
              : 'Professeur';
            
            const enrollmentDate = enrollmentDatesMap.get(enrollment.formations.id);
            
            // Compter les messages non lus pour les étudiants
            const { data: unreadMessages } = await supabase
              .from('lesson_messages')
              .select('id', { count: 'exact' })
              .eq('formation_id', enrollment.formations.id)
              .eq('receiver_id', user.id)
              .eq('is_read', false);

            conversations.push({
              id: `student-${enrollment.formations.id}`,
              name: `${enrollment.formations.title}`,
              lastMessage: `Formation avec ${authorName}`,
              timestamp: 'Aujourd\'hui',
              created_at: enrollmentDate || new Date().toISOString(),
              unread: unreadMessages?.length || 0,
              avatar: '📚',
              online: false,
              type: 'formation_student',
              formationId: enrollment.formations.id
            });
          }
        }
      }

      // Récupérer les conversations de stories via conversation_messages
      const { data: storyMessages } = await supabase
        .from('conversation_messages')
        .select(`
          id,
          story_id,
          sender_id,
          receiver_id,
          content,
          created_at,
          user_stories:story_id (
            content_text,
            media_url,
            content_type,
            user_id
          )
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      if (storyMessages) {
        // Grouper les messages uniquement par interlocuteur (pas par story)
        const storyConversationsMap = new Map();
        
        for (const msg of storyMessages) {
          const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          
          // Exclure le système
          if (otherUserId === SYSTEM_USER_ID) continue;
          
          // Une seule conversation par paire d'utilisateurs
          const key = otherUserId;
          
          if (!storyConversationsMap.has(key)) {
            storyConversationsMap.set(key, {
              otherUserId,
              messages: [],
            });
          }
          
          storyConversationsMap.get(key).messages.push(msg);
        }

        // Récupérer les profils des interlocuteurs
        const userIds = Array.from(new Set(storyMessages.map(msg => 
          msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
        ))).filter(id => id !== SYSTEM_USER_ID);

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, avatar_url')
          .in('id', userIds);

        const profilesMap = new Map();
        if (profiles) {
          profiles.forEach(profile => {
            profilesMap.set(profile.id, profile);
          });
        }

        // Créer les conversations pour l'interface
        for (const [key, convData] of storyConversationsMap) {
          const profile = profilesMap.get(convData.otherUserId);
          const lastMsg = convData.messages[convData.messages.length - 1];
          
          const otherName = profile 
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username || 'Utilisateur'
            : 'Utilisateur';

          let lastMessage = lastMsg.content.substring(0, 50);
          if (lastMsg.content.length > 50) lastMessage += '...';

          const createdAt = new Date(lastMsg.created_at);
          const timeLabel = createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          // Compter les messages non lus pour cette conversation directe
          const { data: unreadDirectMessages } = await supabase
            .from('conversation_messages')
            .select('id', { count: 'exact' })
            .eq('sender_id', convData.otherUserId)
            .eq('receiver_id', user.id)
            .eq('is_read', false);

          conversations.push({
            id: `user-${convData.otherUserId}`,
            name: otherName,
            lastMessage,
            timestamp: timeLabel,
            created_at: lastMsg.created_at,
            unread: unreadDirectMessages?.length || 0,
            avatar: profile?.avatar_url || '💬',
            online: false,
            type: 'direct_message',
            otherUserId: convData.otherUserId
          });
        }
      }

      // Trier les conversations du plus récent au plus ancien
      return conversations.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
    },
    enabled: !!user?.id,
  });
};
