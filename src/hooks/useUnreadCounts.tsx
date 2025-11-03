
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUnreadCounts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unread-counts', user?.id],
    queryFn: async () => {
      if (!user?.id) return { notifications: 0, messages: 0, total: 0 };

      // Compter les notifications non lues
      const { data: notificationsData, error: notifError } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .or(`user_id.eq.${user.id},is_for_all_admins.eq.true`)
        .eq('is_read', false);

      if (notifError) {
        console.error('Error counting notifications:', notifError);
      }

      // Compter les messages directs non lus
      const { data: conversationMessagesData, error: convMsgError } = await supabase
        .from('conversation_messages')
        .select('id', { count: 'exact' })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (convMsgError) {
        console.error('Error counting conversation messages:', convMsgError);
      }

      const notificationsCount = notificationsData?.length || 0;
      const conversationMessagesCount = conversationMessagesData?.length || 0;
      const messagesCount = conversationMessagesCount;
      const total = notificationsCount + messagesCount;

      return {
        notifications: notificationsCount,
        messages: messagesCount,
        total
      };
    },
    enabled: !!user?.id,
    refetchInterval: 10000, // Rafraîchir toutes les 10 secondes
  });
};
