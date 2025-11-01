import React from 'react';
import { UserPlus, Clock, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFollow } from '@/friends/hooks/useFollow';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FriendRequestNotificationCardProps {
  notification: {
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    user_id?: string;
  };
}

const FriendRequestNotificationCard: React.FC<FriendRequestNotificationCardProps> = ({ 
  notification 
}) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = React.useState(false);
  const [requestData, setRequestData] = React.useState<any>(null);

  // Marquer automatiquement comme lue à l'affichage
  React.useEffect(() => {
    if (!notification.is_read) {
      const markAsRead = async () => {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.id);
        
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
      };

      const timer = setTimeout(markAsRead, 500);
      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.is_read, queryClient]);

  React.useEffect(() => {
    const loadRequestData = async () => {
      if (!notification.user_id) return;

      const { data } = await supabase
        .from('friend_requests')
        .select(`
          id,
          status,
          sender:profiles!friend_requests_sender_id_fkey(
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('sender_id', notification.user_id)
        .eq('status', 'pending')
        .maybeSingle();

      setRequestData(data);
    };

    loadRequestData();
  }, [notification.user_id]);

  const handleAccept = async () => {
    if (!requestData?.id) return;
    
    setLoading(true);
    try {
      await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestData.id);

      // Marquer la notification comme lue
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);

      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friends-count'] });
    } catch (error) {
      console.error('Erreur acceptation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!requestData?.id) return;
    
    setLoading(true);
    try {
      await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestData.id);

      // Marquer la notification comme lue
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);

      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
    } catch (error) {
      console.error('Erreur rejet:', error);
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: fr
  });

  const sender = requestData?.sender;
  const senderName = sender?.first_name && sender?.last_name
    ? `${sender.first_name} ${sender.last_name}`
    : sender?.username || 'Un utilisateur';

  return (
    <div className={`bg-white rounded-lg p-4 border ${!notification.is_read ? 'border-l-4 border-l-blue-500' : ''}`}>
      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <UserPlus size={16} className="text-blue-600" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
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

            {!notification.is_read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
          </div>

          {requestData && requestData.status === 'pending' && (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleAccept}
                disabled={loading}
                className="flex items-center gap-1"
              >
                <Check size={14} />
                Accepter
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleReject}
                disabled={loading}
                className="flex items-center gap-1"
              >
                <X size={14} />
                Refuser
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendRequestNotificationCard;
