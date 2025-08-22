import React from 'react';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import EnrollmentRequestCard from '@/components/admin/EnrollmentRequestCard';
import { useNotifications } from '@/hooks/useNotifications';

interface EnrollmentNotificationCardProps {
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

const EnrollmentNotificationCard: React.FC<EnrollmentNotificationCardProps> = ({ 
  notification 
}) => {
  const { handleEnrollment, isHandlingEnrollment } = useNotifications();

  if (!notification.user_info || !notification.formation_info) {
    return null;
  }

  const enrollmentData = {
    id: notification.enrollment_id!,
    user_id: notification.user_info.id,
    formation_id: '',
    status: 'pending' as const,
    created_at: notification.created_at,
    profiles: {
      id: notification.user_info.id,
      first_name: notification.user_info.first_name,
      last_name: notification.user_info.last_name,
      username: notification.user_info.username,
      avatar_url: notification.user_info.avatar_url,
      email: notification.user_info.email,
      phone: notification.user_info.phone,
      
    },
    formations: {
      title: notification.formation_info.title,
      image_url: notification.formation_info.image_url,
    }
  };

  return (
    <div className="relative mb-4">
      <EnrollmentRequestCard
        enrollment={enrollmentData}
        onApprove={({ enrollmentId, status, rejectedReason }) => {
          handleEnrollment({
            enrollmentId,
            action: status,
            reason: rejectedReason
          });
        }}
        isUpdating={isHandlingEnrollment}
      />
      {!notification.is_read && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
      )}
    </div>
  );
};

export default EnrollmentNotificationCard;
