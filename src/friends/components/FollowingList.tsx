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

      // Récupérer les demandes envoyées (pending + accepted)
      const { data: sentRequests, error: sentError } = await supabase
        .from('friend_requests')
        .select('id, status, sender_id, receiver_id, created_at')
        .eq('sender_id', userId)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;

      // Récupérer les demandes reçues et acceptées (l'utilisateur suit aussi l'autre)
      const { data: receivedAccepted, error: receivedError } = await supabase
        .from('friend_requests')
        .select('id, status, sender_id, receiver_id, created_at')
        .eq('receiver_id', userId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (receivedError) throw receivedError;

      // Combiner les deux listes sans doublons
      const allRequests = [...(sentRequests || [])];
      const existingReceiverIds = new Set(sentRequests?.map(r => r.receiver_id) || []);
      
      receivedAccepted?.forEach(req => {
        // Ajouter seulement si cet utilisateur n'est pas déjà dans la liste
        if (!existingReceiverIds.has(req.sender_id)) {
          allRequests.push(req);
        }
      });

      if (allRequests.length === 0) return [];

      // Récupérer les IDs des personnes suivies
      const followedIds = allRequests.map(r => 
        r.sender_id === userId ? r.receiver_id : r.sender_id
      );

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url, is_verified')
        .in('id', followedIds);

      if (profilesError) throw profilesError;

      // Combiner les données
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      return allRequests.map(req => {
        const followedUserId = req.sender_id === userId ? req.receiver_id : req.sender_id;
        return {
          ...req,
          receiver: profilesMap.get(followedUserId),
          receiver_id: followedUserId // Normaliser pour l'affichage
        };
      });
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
