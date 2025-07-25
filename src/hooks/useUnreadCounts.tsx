
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

      // Compter les messages non lus (approximation basée sur les conversations)
      const { data: messagesData, error: msgError } = await supabase
        .from('lesson_messages')
        .select('id', { count: 'exact' })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (msgError) {
        console.error('Error counting messages:', msgError);
      }

      const notificationsCount = notificationsData?.length || 0;
      const messagesCount = messagesData?.length || 0;
      const total = notificationsCount + messagesCount;

      return {
        notifications: notificationsCount,
        messages: messagesCount,
        total
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  });
};
