
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const SYSTEM_USER_ID = '4c32c988-3b19-4eca-87cb-0e0595fd7fbb';

export const useConversations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['conversations', user?.id],
    staleTime: 30000, // Données considérées fraîches pendant 30 secondes
    refetchInterval: 6000, // Rafraîchir toutes les 6 secondes au lieu de 5
    queryFn: async () => {
      if (!user?.id) return [];

      // Récupérer toutes les données en parallèle pour optimiser les performances
      const [
        teacherFormations, 
        studentEnrollments,
        teacherUnreadCounts,
        studentUnreadCounts,
        storyMessages
      ] = await Promise.all([
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
            created_at,
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
          .eq('status', 'approved'),
        
        // Compter tous les messages non lus pour les profs en une seule requête
        supabase
          .from('lesson_messages')
          .select('formation_id')
          .is('read_by_teachers', null)
          .neq('sender_id', user.id)
          .eq('is_system_message', false),
        
        // Compter tous les messages non lus pour les étudiants en une seule requête  
        supabase
          .from('lesson_messages')
          .select('formation_id')
          .eq('receiver_id', user.id)
          .eq('is_read', false),
        
        // Récupérer les conversations de stories
        supabase
          .from('conversation_messages')
          .select(`
            id,
            story_id,
            sender_id,
            receiver_id,
            content,
            created_at,
            is_read,
            user_stories:story_id (
              content_text,
              media_url,
              content_type,
              user_id
            )
          `)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: true })
      ]);

      // Créer des maps pour les comptages de messages non lus
      const teacherUnreadMap = new Map<string, number>();
      teacherUnreadCounts.data?.forEach(msg => {
        const count = teacherUnreadMap.get(msg.formation_id) || 0;
        teacherUnreadMap.set(msg.formation_id, count + 1);
      });

      const studentUnreadMap = new Map<string, number>();
      studentUnreadCounts.data?.forEach(msg => {
        const count = studentUnreadMap.get(msg.formation_id) || 0;
        studentUnreadMap.set(msg.formation_id, count + 1);
      });

      const conversations = [];

      // Ajouter les conversations des formations où l'utilisateur est enseignant
      if (teacherFormations.data) {
        for (const teacher of teacherFormations.data) {
          for (const tf of teacher.teacher_formations) {
            if (tf.formations) {
              conversations.push({
                id: `teacher-${tf.formations.id}`,
                name: `${tf.formations.title} - Groupe`,
                lastMessage: 'Formation dont vous êtes professeur',
                timestamp: 'Aujourd\'hui',
                created_at: tf.formations.created_at || new Date().toISOString(),
                unread: teacherUnreadMap.get(tf.formations.id) || 0,
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
        for (const enrollment of studentEnrollments.data) {
          if (enrollment.formations) {
            const authorName = enrollment.formations.profiles 
              ? `${enrollment.formations.profiles.first_name || ''} ${enrollment.formations.profiles.last_name || ''}`.trim() || enrollment.formations.profiles.username
              : 'Professeur';

            conversations.push({
              id: `student-${enrollment.formations.id}`,
              name: `${enrollment.formations.title}`,
              lastMessage: `Formation avec ${authorName}`,
              timestamp: 'Aujourd\'hui',
              created_at: enrollment.created_at || new Date().toISOString(),
              unread: studentUnreadMap.get(enrollment.formations.id) || 0,
              avatar: '📚',
              online: false,
              type: 'formation_student',
              formationId: enrollment.formations.id
            });
          }
        }
      }

      // Traiter les conversations de stories (déjà récupérées en parallèle)
      if (storyMessages.data) {
        // Grouper les messages par interlocuteur et compter les non lus
        const storyConversationsMap = new Map();
        const unreadCountMap = new Map<string, number>();
        
        for (const msg of storyMessages.data) {
          const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          
          // Exclure le système
          if (otherUserId === SYSTEM_USER_ID) continue;
          
          // Compter les non lus
          if (msg.receiver_id === user.id && !msg.is_read) {
            const count = unreadCountMap.get(otherUserId) || 0;
            unreadCountMap.set(otherUserId, count + 1);
          }
          
          // Une seule conversation par paire d'utilisateurs
          if (!storyConversationsMap.has(otherUserId)) {
            storyConversationsMap.set(otherUserId, {
              otherUserId,
              messages: [],
            });
          }
          
          storyConversationsMap.get(otherUserId).messages.push(msg);
        }

        // Récupérer les profils en une seule requête
        const userIds = Array.from(storyConversationsMap.keys());
        
        if (userIds.length > 0) {
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
          for (const [otherUserId, convData] of storyConversationsMap) {
            const profile = profilesMap.get(otherUserId);
            const lastMsg = convData.messages[convData.messages.length - 1];
            
            const otherName = profile 
              ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username || 'Utilisateur'
              : 'Utilisateur';

            let lastMessage = lastMsg.content.substring(0, 50);
            if (lastMsg.content.length > 50) lastMessage += '...';

            const createdAt = new Date(lastMsg.created_at);
            const timeLabel = createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            conversations.push({
              id: `user-${otherUserId}`,
              name: otherName,
              lastMessage,
              timestamp: timeLabel,
              created_at: lastMsg.created_at,
              unread: unreadCountMap.get(otherUserId) || 0,
              avatar: profile?.avatar_url || '💬',
              online: false,
              type: 'direct_message',
              otherUserId: otherUserId
            });
          }
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
