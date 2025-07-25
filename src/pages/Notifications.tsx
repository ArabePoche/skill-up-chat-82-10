
import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationItem from '@/components/NotificationItem';
import { useAuth } from '@/hooks/useAuth';

const Notifications = () => {
  const { notifications, isLoading } = useNotifications();
  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-500">Chargement des notifications...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-16 md:pb-0">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Notifications</h1>
          <p className="text-gray-600">Restez informé de toutes vos activités</p>
        </div>

        {!user ? (
          <div className="bg-white rounded-lg p-8 border text-center">
            <Bell size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Connectez-vous pour voir vos notifications</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-lg p-8 border text-center">
            <Bell size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium mb-2">Aucune notification</p>
            <p className="text-gray-500 text-sm">
              Vous serez notifié ici des nouvelles activités
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
