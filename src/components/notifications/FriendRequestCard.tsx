import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus, Check } from 'lucide-react';
import { useFollow } from '@/hooks/useFollow';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface FriendRequestCardProps {
  notification: {
    id: string;
    sender_id?: string;
  };
}

const FriendRequestCard: React.FC<FriendRequestCardProps> = ({ notification }) => {
  const { user } = useAuth();
  const [senderProfile, setSenderProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const { 
    friendshipStatus, 
    sendRequest, 
    acceptRequest, 
    isLoading 
  } = useFollow(notification.sender_id);

  React.useEffect(() => {
    const loadSenderProfile = async () => {
      if (!notification.sender_id) return;

      const { data } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url')
        .eq('id', notification.sender_id)
        .single();

      setSenderProfile(data);
      setLoading(false);
    };

    loadSenderProfile();
  }, [notification.sender_id]);

  const handleFollowBack = async () => {
    if (friendshipStatus === 'pending_received') {
      acceptRequest();
    } else if (friendshipStatus === 'none') {
      sendRequest();
    }
    
    // Marquer la notification comme lue
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification.id);
  };

  if (loading || !senderProfile) {
    return null;
  }

  const displayName = senderProfile.first_name && senderProfile.last_name
    ? `${senderProfile.first_name} ${senderProfile.last_name}`
    : senderProfile.username || 'Utilisateur';

  const getButtonContent = () => {
    if (friendshipStatus === 'friends') {
      return (
        <>
          <Check size={16} />
          Abonné
        </>
      );
    }
    return (
      <>
        <Plus size={16} />
        S'abonner en retour
      </>
    );
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
      <Avatar className="w-12 h-12">
        <AvatarImage src={senderProfile.avatar_url} />
        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
          {displayName[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <p className="font-medium text-foreground">{displayName}</p>
        <p className="text-sm text-muted-foreground">Demande d'abonnement</p>
      </div>

      <Button
        onClick={handleFollowBack}
        disabled={isLoading || friendshipStatus === 'friends'}
        variant={friendshipStatus === 'friends' ? 'outline' : 'default'}
        size="sm"
        className="gap-2"
      >
        {getButtonContent()}
      </Button>
    </div>
  );
};

export default FriendRequestCard;
