import React from 'react';
import { Bell, UserPlus, Users, BookOpen, CreditCard, Briefcase } from 'lucide-react';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useCategoryNotifications } from '@/hooks/notifications/useCategoryNotifications';
import NotificationItem from '@/components/NotificationItem';

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
  // Charger les notifications uniquement quand la catégorie est ouverte
  const { data: notifications = [], isLoading } = useCategoryNotifications(category, isOpen);

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
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getCategoryTitle = (cat: string) => {
    switch (cat) {
      case 'friend_requests':
        return 'Demandes d\'amitié';
      case 'enrollment_requests':
        return 'Demandes d\'inscription';
      case 'plan_changes':
        return 'Changements de plan';
      case 'payment_requests':
        return 'Demandes de paiement';
      case 'applications':
        return 'Candidatures';
      case 'reactions':
        return 'Réactions publications';
      default:
        return 'Autres notifications';
    }
  };

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
            Chargement...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            Aucune notification dans cette catégorie
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
