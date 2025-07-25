
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const SYSTEM_USER_ID = '4c32c988-3b19-4eca-87cb-0e0595fd7fbb';

export const useConversations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      console.log('Fetching conversations for user:', user.id);

      // Récupérer les formations où l'utilisateur est enseignant ou étudiant
      const [teacherFormations, studentEnrollments, storyConversations] = await Promise.all([
        supabase
          .from('teachers')
          .select(`
            id,
            teacher_formations!inner (
              formation_id,
              formations (
                id,
                title,
                description
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
          .eq('status', 'approved'),

        // Récupérer les conversations de stories avec des relations explicites
        supabase
          .from('story_conversations')
          .select(`
            id,
            story_id,
            participant1_id,
            participant2_id,
            last_message_at,
            user_stories:story_id (
              content_text,
              media_url,
              content_type
            )
          `)
          .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
          .order('last_message_at', { ascending: false })
      ]);

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
                unread: 0,
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
              unread: 0,
              avatar: '📚',
              online: false,
              type: 'formation_student',
              formationId: enrollment.formations.id
            });
          }
        }
      }

      // Ajouter les conversations de stories (exclure le système)
      if (storyConversations.data) {
        // Récupérer les profils des participants séparément pour éviter l'ambiguïté
        const participantIds = storyConversations.data.flatMap(conv => [conv.participant1_id, conv.participant2_id]);
        const uniqueParticipantIds = [...new Set(participantIds)];
        
        const { data: participantProfiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, avatar_url')
          .in('id', uniqueParticipantIds);

        const profilesMap = new Map();
        if (participantProfiles) {
          participantProfiles.forEach(profile => {
            profilesMap.set(profile.id, profile);
          });
        }

        // Récupérer les messages pour chaque conversation
        const conversationIds = storyConversations.data.map(conv => conv.id);
        const { data: storyMessages } = await supabase
          .from('story_messages')
          .select('conversation_id, content, created_at')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false });

        const messagesMap = new Map();
        if (storyMessages) {
          storyMessages.forEach(msg => {
            if (!messagesMap.has(msg.conversation_id)) {
              messagesMap.set(msg.conversation_id, []);
            }
            messagesMap.get(msg.conversation_id).push(msg);
          });
        }

        for (const conv of storyConversations.data) {
          // Identifier l'autre participant (pas soi-même et pas le système)
          const otherParticipantId = conv.participant1_id === user.id 
            ? conv.participant2_id 
            : conv.participant1_id;

          // Exclure les conversations avec le système
          if (otherParticipantId === SYSTEM_USER_ID) {
            continue;
          }

          const otherParticipant = profilesMap.get(otherParticipantId);
          const otherName = otherParticipant 
            ? `${otherParticipant.first_name || ''} ${otherParticipant.last_name || ''}`.trim() || otherParticipant.username || 'Utilisateur'
            : 'Utilisateur';

          // Dernier message ou extrait de story
          let lastMessage = 'Réponse à une story';
          const convMessages = messagesMap.get(conv.id);
          if (convMessages && convMessages.length > 0) {
            const lastMsg = convMessages[0]; // Déjà trié par created_at desc
            lastMessage = lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : '');
          } else if (conv.user_stories) {
            const story = conv.user_stories;
            if (story.content_type === 'text' && story.content_text) {
              lastMessage = `Story: ${story.content_text.substring(0, 30)}...`;
            } else {
              lastMessage = 'Story partagée';
            }
          }

          conversations.push({
            id: `story-${conv.id}`,
            name: otherName,
            lastMessage,
            timestamp: new Date(conv.last_message_at).toLocaleDateString(),
            unread: 0,
            avatar: otherParticipant?.avatar_url || '💬',
            online: false,
            type: 'story_conversation',
            conversationId: conv.id
          });
        }
      }

      console.log('Fetched conversations:', conversations);
      return conversations;
    },
    enabled: !!user?.id,
  });
};
