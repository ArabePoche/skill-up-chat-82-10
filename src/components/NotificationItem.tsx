
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import EnrollmentNotificationCard from '@/components/notifications/EnrollmentNotificationCard';
import StandardNotificationCard from '@/components/notifications/StandardNotificationCard';

interface NotificationItemProps {
  notification: {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
    enrollment_id?: string;
    is_for_all_admins: boolean;
    user_info?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      username: string;
      phone?: string;
      avatar_url?: string;
    } | null;
    formation_info?: {
      title: string;
      image_url?: string;
    } | null;
  };
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => {
  const { profile } = useAuth();

  const isAdmin = profile?.role === 'admin';
  const isEnrollmentNotification = notification.type === 'enrollment_request' && 
    notification.enrollment_id && 
    notification.is_for_all_admins &&
    isAdmin;

  // Si c'est une notification d'inscription pour les admins, utiliser EnrollmentNotificationCard
  if (isEnrollmentNotification && notification.user_info && notification.formation_info) {
    return <EnrollmentNotificationCard notification={notification} />;
  }

  // Pour les autres types de notifications, utiliser StandardNotificationCard
  return <StandardNotificationCard notification={notification} />;
};

export default NotificationItem;
