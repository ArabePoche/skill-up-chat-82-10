import React, { useEffect } from 'react';
import { Bell, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface StandardNotificationCardProps {
  notification: {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
  };
}

const StandardNotificationCard: React.FC<StandardNotificationCardProps> = ({ 
  notification 
}) => {
  const queryClient = useQueryClient();

  // Marquer automatiquement comme lue à l'affichage
  useEffect(() => {
    if (!notification.is_read) {
      const markAsRead = async () => {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.id);
        
        // Invalider les compteurs pour mise à jour
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
      };
      
      // Délai léger pour éviter trop de requêtes
      const timer = setTimeout(markAsRead, 500);
      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.is_read, queryClient]);

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

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: fr
  });

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

              <p className="text-xs text-gray-400 mt-2 flex items-center">
                <Clock size={12} className="mr-1" />
                {timeAgo}
              </p>
            </div>
          </div>
        </div>

        {!notification.is_read && (
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        )}
      </div>
    </div>
  );
};

export default StandardNotificationCard;
