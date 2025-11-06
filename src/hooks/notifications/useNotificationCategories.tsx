import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook optimisé qui charge uniquement les compteurs de notifications par catégorie
 * Utilisé pour l'affichage initial de la page Messages
 */
export const useNotificationCategories = () => {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  return useQuery({
    queryKey: ['notification-categories', user?.id],
    staleTime: 30000,
    refetchInterval: 60000,
    queryFn: async () => {
      if (!user?.id) return [];

      // Récupérer toutes les notifications avec type et id
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('id, type, is_read, user_id, is_for_all_admins')
        .or(`user_id.eq.${user.id},is_for_all_admins.eq.true`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notification categories:', error);
        return [];
      }

      // Compter par catégorie (total et non lus)
      const categories = {
        friend_requests: { total: 0, unread: 0, ids: [] as string[] },
        enrollment_requests: { total: 0, unread: 0, ids: [] as string[] },
        plan_changes: { total: 0, unread: 0, ids: [] as string[] },
        payment_requests: { total: 0, unread: 0, ids: [] as string[] },
        applications: { total: 0, unread: 0, ids: [] as string[] },
        reactions: { total: 0, unread: 0, ids: [] as string[] },
        orders: { total: 0, unread: 0, ids: [] as string[] },
        others: { total: 0, unread: 0, ids: [] as string[] },
      };

      notifications?.forEach((notification) => {
        if (notification.type === 'friend_request') {
          categories.friend_requests.total++;
          categories.friend_requests.ids.push(notification.id);
          if (!notification.is_read) categories.friend_requests.unread++;
        } else if (notification.type === 'enrollment_request' && isAdmin) {
          categories.enrollment_requests.total++;
          categories.enrollment_requests.ids.push(notification.id);
          if (!notification.is_read) categories.enrollment_requests.unread++;
        } else if (notification.type === 'plan_change_request' && isAdmin) {
          categories.plan_changes.total++;
          categories.plan_changes.ids.push(notification.id);
          if (!notification.is_read) categories.plan_changes.unread++;
        } else if (notification.type === 'payment_request' && isAdmin) {
          categories.payment_requests.total++;
          categories.payment_requests.ids.push(notification.id);
          if (!notification.is_read) categories.payment_requests.unread++;
        } else if (notification.type === 'application_received') {
          categories.applications.total++;
          categories.applications.ids.push(notification.id);
          if (!notification.is_read) categories.applications.unread++;
        } else if (notification.type === 'post_reaction' || notification.type === 'video_reaction') {
          categories.reactions.total++;
          categories.reactions.ids.push(notification.id);
          if (!notification.is_read) categories.reactions.unread++;
        } else if (notification.type === 'order') {
          categories.orders.total++;
          categories.orders.ids.push(notification.id);
          if (!notification.is_read) categories.orders.unread++;
        } else {
          categories.others.total++;
          categories.others.ids.push(notification.id);
          if (!notification.is_read) categories.others.unread++;
        }
      });

      return Object.entries(categories)
        .filter(([_, data]) => data.total > 0)
        .map(([key, data]) => ({
          category: key,
          totalCount: data.total,
          unreadCount: data.unread,
          notificationIds: data.ids,
        }));
    },
    enabled: !!user?.id,
  });
};
