
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

      // Récupérer uniquement les conversations de stories
      const { data: storyMessages } = await supabase
        .from('conversation_messages')
        .select(`
          id,
          story_id,
          sender_id,
          receiver_id,
          content,
          created_at,
          is_read
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      const conversations = [];

      // Traiter les conversations de stories
      if (storyMessages) {
        // Grouper les messages par interlocuteur et compter les non lus
        const storyConversationsMap = new Map();
        const unreadCountMap = new Map<string, number>();
        
        for (const msg of storyMessages) {
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
