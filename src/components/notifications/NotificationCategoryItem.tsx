import React, { useEffect } from 'react';
import { Bell, UserPlus, Users, BookOpen, CreditCard, Briefcase, ShoppingCart } from 'lucide-react';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useCategoryNotifications } from './hooks/useCategoryNotifications';
import NotificationItem from './NotificationItem';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useI18nReady } from '@/hooks/useI18nReady';

interface NotificationCategoryItemProps {
  category: string;
  totalCount: number;
  unreadCount: number;
  isOpen: boolean;
}

/**
 * Composant pour afficher une catégorie de notifications avec lazy loading
 */
const NotificationCategoryItem: React.FC<NotificationCategoryItemProps> = ({
  category,
  totalCount,
  unreadCount,
  isOpen,
}) => {
  const { t } = useTranslation();
  const i18nReady = useI18nReady();
  const queryClient = useQueryClient();
  // Charger les notifications uniquement quand la catégorie est ouverte
  const { data: notifications = [], isLoading } = useCategoryNotifications(category, isOpen);

  // Marquer toutes les notifications de réaction comme lues lors de l'ouverture
  // SANS rafraîchir l'UI immédiatement pour une meilleure UX
  useEffect(() => {
    if (isOpen && category === 'reactions' && notifications.length > 0) {
      const unreadReactionIds = notifications
        .filter((n: any) => !n.is_read)
        .map((n: any) => n.id);

      if (unreadReactionIds.length > 0) {
        // Marquer comme lues en base de données après un petit délai
        // mais ne pas invalider les queries pour garder l'UI stable
        const timer = setTimeout(async () => {
          await supabase
            .from('notifications')
            .update({ is_read: true })
            .in('id', unreadReactionIds);
          
          // On ne rafraîchit PAS l'interface ici volontairement
          // L'utilisateur verra le changement à sa prochaine visite
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, category, notifications]);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'friend_requests':
        return <UserPlus className="w-5 h-5" />;
      case 'enrollment_requests':
        return <Users className="w-5 h-5" />;
      case 'plan_changes':
        return <BookOpen className="w-5 h-5" />;
      case 'payment_requests':
        return <CreditCard className="w-5 h-5" />;
      case 'applications':
        return <Briefcase className="w-5 h-5" />;
      case 'reactions':
        return <span className="text-xl">❤️</span>;
      case 'orders':
        return <ShoppingCart className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getCategoryTitle = (cat: string) => {
    switch (cat) {
      case 'friend_requests':
        return t('notifications.categories.friendRequests');
      case 'enrollment_requests':
        return t('notifications.categories.enrollmentRequests');
      case 'plan_changes':
        return t('notifications.categories.planChanges');
      case 'payment_requests':
        return t('notifications.categories.paymentRequests');
      case 'applications':
        return t('notifications.categories.applications');
      case 'reactions':
        return t('notifications.categories.reactions');
      case 'orders':
        return t('notifications.categories.orders');
      default:
        return t('notifications.categories.other');
    }
  };

  if (!i18nReady) {
    return null;
  }

  return (
    <AccordionItem value={category} className="bg-white rounded-lg border">
      <AccordionTrigger className="px-6 py-4 hover:no-underline">
        <div className="flex items-center gap-3">
          <div className="text-primary">
            {getCategoryIcon(category)}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">
              {getCategoryTitle(category)}
            </span>
            <span className="bg-primary/10 text-primary text-sm font-medium px-2.5 py-0.5 rounded-full">
              {totalCount}
            </span>
            {unreadCount > 0 && (
              <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-4">
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">
            {t('common.loading')}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            {t('notifications.noCategoryNotifications')}
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
};

export default NotificationCategoryItem;
