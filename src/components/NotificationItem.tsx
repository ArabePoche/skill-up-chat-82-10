import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import EnrollmentNotificationCard from '@/components/notifications/EnrollmentNotificationCard';
import StandardNotificationCard from '@/components/notifications/StandardNotificationCard';
import PlanChangeNotificationCard from '@/components/notifications/PlanChangeNotificationCard';
import PaymentRequestNotificationCard from '@/components/notifications/PaymentRequestNotificationCard';

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
    user_id?: string;
    formation_id?: string;
    requested_plan_type?: string;
    order_id?: string;
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

  const isPlanChangeNotification = notification.type === 'plan_change_request' &&
    notification.user_id &&
    notification.formation_id &&
    notification.requested_plan_type &&
    isAdmin;

  const isPaymentRequest = notification.type === 'payment_request' &&
    notification.user_id &&
    notification.formation_id &&
    isAdmin;

  // Si c'est une notification de demande de changement de plan pour les admins
  if (isPlanChangeNotification && notification.user_info && notification.formation_info) {
    return <PlanChangeNotificationCard notification={{
      ...notification,
      user_id: notification.user_id!,
      formation_id: notification.formation_id!,
      requested_plan_type: notification.requested_plan_type!
    }} />;
  }

  // Si c'est une notification d'inscription pour les admins
  if (isEnrollmentNotification && notification.user_info && notification.formation_info) {
    return <EnrollmentNotificationCard notification={notification} />;
  }

  // Si c'est une notification de demande de paiement pour les admins
  if (isPaymentRequest && notification.user_info && notification.formation_info) {
    return <PaymentRequestNotificationCard notification={{
      id: notification.id,
      user_id: notification.user_id!,
      formation_id: notification.formation_id!,
      created_at: notification.created_at,
      order_id: notification.order_id,
      user_info: notification.user_info,
      formation_info: notification.formation_info,
    }} />;
  }

  // Pour les autres types de notifications
  return <StandardNotificationCard notification={notification} />;
};

export default NotificationItem;
