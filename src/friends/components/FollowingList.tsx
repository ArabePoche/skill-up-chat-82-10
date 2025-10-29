import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import VerifiedBadge from '@/components/VerifiedBadge';

/**
 * Liste des utilisateurs suivis (demandes envoyées)
 */
interface FollowingListProps {
  userId?: string;
}

const FollowingList: React.FC<FollowingListProps> = ({ userId }) => {
  const navigate = useNavigate();

  const { data: following = [], isLoading, refetch } = useQuery({
    queryKey: ['following-list', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Récupérer d'abord les demandes envoyées
      const { data: requests, error: requestsError } = await supabase
        .from('friend_requests')
        .select('id, status, receiver_id, created_at')
        .eq('sender_id', userId)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      if (!requests || requests.length === 0) return [];

      // Récupérer les profils des receivers
      const receiverIds = requests.map(r => r.receiver_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url, is_verified')
        .in('id', receiverIds);

      if (profilesError) throw profilesError;

      // Combiner les données
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      return requests.map(req => ({
        ...req,
        receiver: profilesMap.get(req.receiver_id)
      }));
    },
    enabled: !!userId,
  });

  const handleCancel = async (requestId: string) => {
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      toast.error('Erreur lors de l\'annulation');
      return;
    }

    toast.success('Demande annulée');
    refetch();
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">Chargement...</div>;
  }

  if (following.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucun utilisateur suivi
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {following.map((item) => {
        const receiver = item.receiver as any;
        const displayName = receiver?.first_name && receiver?.last_name
          ? `${receiver.first_name} ${receiver.last_name}`
          : receiver?.username || 'Utilisateur';

        return (
          <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <Avatar 
              className="cursor-pointer"
              onClick={() => navigate(`/profil/${receiver?.id}`)}
            >
              <AvatarImage src={receiver?.avatar_url} />
              <AvatarFallback>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div 
              className="flex-1 cursor-pointer"
              onClick={() => navigate(`/profil/${receiver?.id}`)}
            >
              <p className="font-medium inline-flex items-center gap-1">
                {displayName}
                {receiver?.is_verified && <VerifiedBadge size={14} showTooltip={false} />}
              </p>
              <p className="text-xs text-muted-foreground">@{receiver?.username}</p>
            </div>

            <div className="flex items-center gap-2">
              {item.status === 'pending' && (
                <span className="text-xs text-yellow-500">En attente</span>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCancel(item.id)}
              >
                <X size={16} />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FollowingList;
