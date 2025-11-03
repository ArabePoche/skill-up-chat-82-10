import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserX, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import VerifiedBadge from '@/components/VerifiedBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Liste des amis (demandes acceptées)
 */
interface FriendsListProps {
  userId?: string;
}

const FriendsList: React.FC<FriendsListProps> = ({ userId }) => {
  const navigate = useNavigate();
  const [friendToRemove, setFriendToRemove] = useState<{ id: string; name: string } | null>(null);

  const { data: friends = [], isLoading, refetch } = useQuery({
    queryKey: ['friends-list', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Récupérer les demandes acceptées
      const { data: requests, error } = await supabase
        .from('friend_requests')
        .select('id, sender_id, receiver_id, created_at')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!requests || requests.length === 0) return [];

      // Récupérer les IDs des amis (l'autre personne dans chaque relation)
      const friendIds = requests.map(req => 
        req.sender_id === userId ? req.receiver_id : req.sender_id
      );

      // Récupérer les profils des amis
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url, is_verified')
        .in('id', friendIds);

      if (profilesError) throw profilesError;

      // Combiner les données
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      return requests.map(req => ({
        ...req,
        sender: req.sender_id === userId ? null : profilesMap.get(req.sender_id),
        receiver: req.receiver_id === userId ? null : profilesMap.get(req.receiver_id)
      }));
    },
    enabled: !!userId,
  });

  const handleRemove = async (requestId: string) => {
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      toast.error('Erreur lors de la suppression');
      return;
    }

    toast.success('Ami retiré');
    refetch();
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">Chargement...</div>;
  }

  if (friends.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucun ami pour le moment
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {friends.map((item) => {
        const friend = item.sender_id === userId ? item.receiver : item.sender;
        const friendData = friend as any;
        const displayName = friendData?.first_name && friendData?.last_name
          ? `${friendData.first_name} ${friendData.last_name}`
          : friendData?.username || 'Utilisateur';

        return (
          <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <Avatar 
              className="cursor-pointer"
              onClick={() => navigate(`/profil/${friendData?.id}`)}
            >
              <AvatarImage src={friendData?.avatar_url} />
              <AvatarFallback>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div 
              className="flex-1 cursor-pointer"
              onClick={() => navigate(`/profil/${friendData?.id}`)}
            >
              <p className="font-medium inline-flex items-center gap-1">
                {displayName}
                {friendData?.is_verified && <VerifiedBadge size={14} showTooltip={false} />}
              </p>
              <p className="text-xs text-muted-foreground">@{friendData?.username}</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/conversations/${friendData?.id}`)}
                className="text-blue-500 hover:text-blue-600"
              >
                <MessageCircle size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setFriendToRemove({ 
                  id: item.id, 
                  name: `${friendData?.first_name || ''} ${friendData?.last_name || ''}`.trim() || friendData?.username || 'Cet ami'
                })}
              >
                <UserX size={16} />
              </Button>
            </div>
          </div>
        );
      })}

      {/* Dialog de confirmation de retrait d'ami */}
      <AlertDialog open={!!friendToRemove} onOpenChange={(open) => !open && setFriendToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer cet ami ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer {friendToRemove?.name} de votre liste d'amis ?
              Vous devrez envoyer une nouvelle demande pour redevenir amis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (friendToRemove) {
                  handleRemove(friendToRemove.id);
                  setFriendToRemove(null);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FriendsList;
