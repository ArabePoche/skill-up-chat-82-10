import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

/**
 * Liste de suggestions aléatoires d'utilisateurs
 */
const SuggestionsList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [sentRequests, setSentRequests] = React.useState<Set<string>>(new Set());

  const { data: suggestions = [], isLoading, refetch } = useQuery({
    queryKey: ['user-suggestions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // D'abord récupérer tous les IDs avec qui on a déjà une relation
      const { data: existingRequests } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      const existingIds = new Set(
        existingRequests?.flatMap(r => [r.sender_id, r.receiver_id]) || []
      );
      existingIds.add(user.id); // Exclure soi-même
      existingIds.add('4c32c988-3b19-4eca-87cb-0e0595fd7fbb'); // Exclure le compte système

      // Récupérer tous les utilisateurs sauf ceux avec une relation existante
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url')
        .not('id', 'in', `(${Array.from(existingIds).join(',')})`)
        .limit(50); // Augmenter pour avoir plus de choix

      if (error) throw error;
      
      // Mélanger et prendre 10 aléatoires
      return (data || []).sort(() => Math.random() - 0.5).slice(0, 10);
    },
    enabled: !!user?.id,
  });

  const handleSendRequest = async (targetUserId: string) => {
    if (!user?.id) return;

    // Récupérer les infos de l'utilisateur qui envoie la demande
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('username, first_name, last_name')
      .eq('id', user.id)
      .single();

    const senderName = senderProfile?.first_name && senderProfile?.last_name
      ? `${senderProfile.first_name} ${senderProfile.last_name}`
      : senderProfile?.username || 'Un utilisateur';

    const { error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user.id,
        receiver_id: targetUserId,
        status: 'pending'
      });

    if (error) {
      console.error('Erreur envoi demande:', error);
      toast.error('Erreur lors de l\'envoi');
      return;
    }

    // Créer une notification pour le destinataire
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: targetUserId,
        sender_id: user.id,
        title: 'Nouvelle demande d\'amitié',
        message: `${senderName} vous a envoyé une demande d'amitié`,
        type: 'friend_request',
        is_read: false
      });

    if (notifError) {
      console.error('Erreur création notification:', notifError);
    }

    toast.success('Demande envoyée');
    setSentRequests(prev => new Set(prev).add(targetUserId));
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">Chargement...</div>;
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucune suggestion disponible
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {suggestions.map((user) => {
        const displayName = user.first_name && user.last_name
          ? `${user.first_name} ${user.last_name}`
          : user.username || 'Utilisateur';

        return (
          <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <Avatar 
              className="cursor-pointer"
              onClick={() => navigate(`/profil/${user.id}`)}
            >
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div 
              className="flex-1 cursor-pointer"
              onClick={() => navigate(`/profil/${user.id}`)}
            >
              <p className="font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">@{user.username}</p>
            </div>

            <Button
              size="sm"
              onClick={() => handleSendRequest(user.id)}
              disabled={sentRequests.has(user.id)}
              className={sentRequests.has(user.id) ? '' : 'bg-red-500 hover:bg-red-600 text-white'}
              variant={sentRequests.has(user.id) ? "secondary" : undefined}
            >
              <UserPlus size={16} className="mr-2" />
              {sentRequests.has(user.id) ? 'Envoyée' : 'Ajouter'}
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export default SuggestionsList;
