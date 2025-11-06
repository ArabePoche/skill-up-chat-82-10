import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import EnrollmentNotificationCard from '@/components/notifications/EnrollmentNotificationCard';
import StandardNotificationCard from '@/components/notifications/StandardNotificationCard';
import PlanChangeNotificationCard from '@/components/notifications/PlanChangeNotificationCard';
import PaymentRequestNotificationCard from '@/components/notifications/PaymentRequestNotificationCard';
import FriendRequestCard from '@/components/notifications/FriendRequestCard';
import ReactionNotificationCard from '@/components/notifications/ReactionNotificationCard';
import ApplicationNotificationCard from '@/components/notifications/ApplicationNotificationCard';
import OrderNotificationCard from '@/components/notifications/OrderNotificationCard';

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
    sender_id?: string;
    formation_id?: string;
    requested_plan_type?: string;
    payment_id?: string;
    application_id?: string;
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
    approved_by_admin?: {
      first_name: string;
      last_name: string;
    } | null;
    subscription_approved_by_admin?: {
      first_name: string;
      last_name: string;
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

  const isFriendRequest = notification.type === 'friend_request' || (
    !!notification.sender_id &&
    !notification.enrollment_id &&
    !notification.formation_id &&
    !notification.payment_id
  );

  const isReactionNotification = notification.type === 'post_reaction' || notification.type === 'video_reaction';

  const isApplicationNotification = notification.type === 'application_received' && notification.application_id;

  // Notification de commande uniquement pour le vendeur (new_order)
  const isOrderNotification = notification.type === 'new_order' && (notification as any).shop_order_id;

  // Si c'est une notification de commande pour le vendeur
  if (isOrderNotification) {
    return <OrderNotificationCard notification={{
      id: notification.id,
      shop_order_id: (notification as any).shop_order_id,
      created_at: notification.created_at,
      is_read: notification.is_read,
      title: notification.title,
      message: notification.message
    }} />;
  }

  // Si c'est une notification de candidature
  if (isApplicationNotification) {
    return <ApplicationNotificationCard notification={{
      id: notification.id,
      application_id: notification.application_id!,
      created_at: notification.created_at,
      is_read: notification.is_read,
      title: notification.title,
      message: notification.message
    }} />;
  }

  // Si c'est une notification de réaction (like/commentaire)
  if (isReactionNotification) {
    return <ReactionNotificationCard notification={notification} />;
  }

  // Si c'est une notification de demande d'amitié
  if (isFriendRequest) {
    return <FriendRequestCard notification={notification} />;
  }

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
      payment_id: notification.payment_id,
      user_info: notification.user_info,
      formation_info: notification.formation_info,
      approved_by_admin: notification.approved_by_admin,
    }} />;
  }

  // Pour les autres types de notifications
  return <StandardNotificationCard notification={notification} />;
};

export default NotificationItem;