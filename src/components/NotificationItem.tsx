
import React, { useState } from 'react';
import { Bell, CheckCircle, XCircle, Clock, User, Phone, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

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
    // Nouvelles propriétés pour les informations utilisateur
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
  const { handleEnrollment, isHandlingEnrollment } = useNotifications();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'enrollment_request':
      case 'enrollment':
        return <Bell size={16} className="text-blue-600" />;
      case 'system':
        return <Bell size={16} className="text-green-600" />;
      default:
        return <Bell size={16} className="text-purple-600" />;
    }
  };

  const getIconBgColor = (type: string) => {
    switch (type) {
      case 'enrollment_request':
      case 'enrollment':
        return 'bg-blue-100';
      case 'system':
        return 'bg-green-100';
      default:
        return 'bg-purple-100';
    }
  };

  const handleApprove = async () => {
    if (notification.enrollment_id) {
      console.log('Approving enrollment:', notification.enrollment_id);
      handleEnrollment({
        enrollmentId: notification.enrollment_id,
        action: 'approved'
      });
    }
  };

  const handleReject = async () => {
    if (notification.enrollment_id) {
      console.log('Rejecting enrollment:', notification.enrollment_id);
      handleEnrollment({
        enrollmentId: notification.enrollment_id,
        action: 'rejected',
        reason: rejectReason
      });
      setShowRejectForm(false);
      setRejectReason('');
    }
  };

  const handleViewProfile = () => {
    if (notification.user_info?.id) {
      // Ouvrir le profil dans un nouvel onglet ou naviguer vers la page profil
      window.open(`/profile/${notification.user_info.id}`, '_blank');
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: fr
  });

  const isAdmin = profile?.role === 'admin';
  const showAdminActions = isAdmin && 
    notification.type === 'enrollment_request' && 
    notification.enrollment_id && 
    notification.is_for_all_admins;

  const getUserDisplayName = () => {
    if (!notification.user_info) return 'Utilisateur';
    const { first_name, last_name, username } = notification.user_info;
    if (first_name && last_name) {
      return `${first_name} ${last_name}`;
    }
    return username || 'Utilisateur';
  };

  const getUserInitials = () => {
    if (!notification.user_info) return 'U';
    const { first_name, last_name, username } = notification.user_info;
    if (first_name && last_name) {
      return `${first_name[0]}${last_name[0]}`.toUpperCase();
    }
    if (username) {
      return username[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <div className={`bg-white rounded-lg p-4 border ${!notification.is_read ? 'border-l-4 border-l-blue-500' : ''}`}>
      <div className="flex items-start space-x-3">
        <div className={`w-10 h-10 ${getIconBgColor(notification.type)} rounded-full flex items-center justify-center`}>
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-medium text-gray-900">{notification.title}</p>
              <p className="text-gray-600 text-sm mt-1">
                {notification.message}
              </p>

              {/* Informations utilisateur enrichies pour les demandes d'inscription */}
              {showAdminActions && notification.user_info && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={notification.user_info.avatar_url || undefined} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <User size={16} className="text-gray-500" />
                        <span className="font-medium text-gray-900">
                          {getUserDisplayName()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {notification.user_info.email}
                      </div>
                      {notification.user_info.phone && (
                        <div className="flex items-center space-x-1 text-sm text-gray-600 mt-1">
                          <Phone size={14} className="text-gray-500" />
                          <span>{notification.user_info.phone}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleViewProfile}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Eye size={14} className="mr-1" />
                      Voir
                    </Button>
                  </div>
                  {notification.formation_info && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Formation:</span> {notification.formation_info.title}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-gray-400 mt-2 flex items-center">
                <Clock size={12} className="mr-1" />
                {timeAgo}
              </p>
            </div>
          </div>

          {/* Actions pour les admins sur les demandes d'inscription */}
          {showAdminActions && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              {!showRejectForm ? (
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    disabled={isHandlingEnrollment}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle size={14} className="mr-1" />
                    Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRejectForm(true)}
                    disabled={isHandlingEnrollment}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <XCircle size={14} className="mr-1" />
                    Rejeter
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Raison du rejet (optionnel)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      onClick={handleReject}
                      disabled={isHandlingEnrollment}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Confirmer le rejet
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectReason('');
                      }}
                      disabled={isHandlingEnrollment}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Indicateur de lecture */}
        {!notification.is_read && (
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        )}
      </div>
    </div>
  );
};

export default NotificationItem;
