import React from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import VerifiedBadge from '@/components/VerifiedBadge';

/**
 * Composant pour afficher les notifications de réactions (likes/commentaires) sur publications
 */

interface ReactionNotificationCardProps {
  notification: any;
}

const ReactionNotificationCard: React.FC<ReactionNotificationCardProps> = ({ notification }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [senderProfile, setSenderProfile] = React.useState<any>(null);

  React.useEffect(() => {
    // Charger les infos de l'utilisateur qui a réagi
    if (notification.sender_id) {
      supabase
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url, is_verified')
        .eq('id', notification.sender_id)
        .single()
        .then(({ data }) => setSenderProfile(data));
    }
  }, [notification.sender_id]);

  const handleClick = async () => {
    // Marquer comme lu en base SANS rafraîchir l'UI pour une UX fluide
    if (!notification.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
      
      // On ne rafraîchit PAS l'interface ici volontairement
      // L'utilisateur verra le changement à sa prochaine visite
    }

    // Rediriger vers la publication
    if (notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    } else if (notification.video_id) {
      navigate(`/video/${notification.video_id}`);
    }
  };

  const displayName = senderProfile
    ? senderProfile.first_name && senderProfile.last_name
      ? `${senderProfile.first_name} ${senderProfile.last_name}`
      : senderProfile.username
    : 'Un utilisateur';

  const reactionIcon = notification.reaction_type === 'like' 
    ? <Heart className="w-5 h-5 text-red-500 fill-red-500" />
    : <MessageCircle className="w-5 h-5 text-blue-500" />;

  return (
    <Card
      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
        !notification.is_read ? 'bg-blue-50 border-blue-200' : 'bg-white'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <Avatar className="w-12 h-12 flex-shrink-0">
          <AvatarImage src={senderProfile?.avatar_url || ''} />
          <AvatarFallback>
            {displayName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {reactionIcon}
            <span className="font-semibold text-gray-900 inline-flex items-center gap-1">
              {displayName}
              {senderProfile?.is_verified && <VerifiedBadge size={14} showTooltip={false} />}
            </span>
          </div>
          
          <p className="text-sm text-gray-700 mb-2">
            {notification.message}
          </p>

          <p className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: fr,
            })}
          </p>
        </div>

        {!notification.is_read && (
          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
        )}
      </div>
    </Card>
  );
};

export default ReactionNotificationCard;