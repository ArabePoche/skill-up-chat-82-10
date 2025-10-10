import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

/**
 * Hook pour gérer le système d'amitié avec demandes
 */
export const useFollow = (targetUserId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Vérifier le statut de la relation avec l'utilisateur
  const { data: friendshipStatus } = useQuery({
    queryKey: ['friendship-status', user?.id, targetUserId],
    queryFn: async () => {
      if (!user?.id || !targetUserId) return { status: 'none', requestId: null };

      // Vérifier si une demande existe (envoyée ou reçue)
      const { data: sentRequest } = await supabase
        .from('friend_requests')
        .select('id, status')
        .eq('sender_id', user.id)
        .eq('receiver_id', targetUserId)
        .maybeSingle();

      if (sentRequest) {
        return { 
          status: sentRequest.status === 'accepted' ? 'friends' : 'pending_sent',
          requestId: sentRequest.id 
        };
      }

      const { data: receivedRequest } = await supabase
        .from('friend_requests')
        .select('id, status')
        .eq('sender_id', targetUserId)
        .eq('receiver_id', user.id)
        .maybeSingle();

      if (receivedRequest) {
        return { 
          status: receivedRequest.status === 'accepted' ? 'friends' : 'pending_received',
          requestId: receivedRequest.id 
        };
      }

      return { status: 'none', requestId: null };
    },
    enabled: !!user?.id && !!targetUserId && user.id !== targetUserId,
  });

  // Envoyer une demande d'amitié
  const sendRequest = useMutation({
    mutationFn: async () => {
      if (!user?.id || !targetUserId) {
        throw new Error('Utilisateur non connecté ou cible invalide');
      }

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

      if (error) throw error;

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendship-status', user?.id, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['pending-requests', user?.id] });
      toast.success('Demande d\'amitié envoyée');
    },
    onError: (error: any) => {
      console.error('Erreur envoi demande:', error);
      toast.error('Erreur lors de l\'envoi de la demande');
    },
  });

  // Accepter une demande d'amitié
  const acceptRequest = useMutation({
    mutationFn: async () => {
      if (!friendshipStatus?.requestId) throw new Error('Aucune demande à accepter');

      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', friendshipStatus.requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendship-status', user?.id, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['pending-requests', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['friends-count', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['friends-count', targetUserId] });
      toast.success('Demande d\'amitié acceptée');
    },
    onError: (error: any) => {
      console.error('Erreur acceptation demande:', error);
      toast.error('Erreur lors de l\'acceptation');
    },
  });

  // Annuler/Refuser une demande
  const cancelRequest = useMutation({
    mutationFn: async () => {
      if (!friendshipStatus?.requestId) throw new Error('Aucune demande à annuler');

      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', friendshipStatus.requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendship-status', user?.id, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['pending-requests', user?.id] });
      toast.success('Demande annulée');
    },
    onError: (error: any) => {
      console.error('Erreur annulation demande:', error);
      toast.error('Erreur lors de l\'annulation');
    },
  });

  // Supprimer un ami
  const removeFriend = useMutation({
    mutationFn: async () => {
      if (!friendshipStatus?.requestId) throw new Error('Aucun ami à supprimer');

      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', friendshipStatus.requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendship-status', user?.id, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['friends-count', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['friends-count', targetUserId] });
      toast.success('Ami retiré');
    },
    onError: (error: any) => {
      console.error('Erreur suppression ami:', error);
      toast.error('Erreur lors de la suppression');
    },
  });

  return {
    friendshipStatus: friendshipStatus?.status || 'none',
    sendRequest: sendRequest.mutate,
    acceptRequest: acceptRequest.mutate,
    cancelRequest: cancelRequest.mutate,
    removeFriend: removeFriend.mutate,
    isLoading: sendRequest.isPending || acceptRequest.isPending || cancelRequest.isPending || removeFriend.isPending,
  };
};

// Hook pour obtenir le nombre d'amis
export const useFollowersCount = (userId?: string) => {
  return useQuery({
    queryKey: ['friends-count', userId],
    queryFn: async () => {
      if (!userId) return 0;

      const { count, error } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

      if (error) {
        console.error('Erreur comptage amis:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!userId,
  });
};

// Hook pour obtenir les demandes d'amitié en attente
export const usePendingRequests = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['pending-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(id, username, first_name, last_name, avatar_url)
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur récupération demandes:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
  });
};

// Hook pour obtenir le nombre de demandes envoyées (pending + accepted)
export const usePendingSentRequests = (userId?: string) => {
  return useQuery({
    queryKey: ['pending-sent-requests', userId],
    queryFn: async () => {
      if (!userId) return 0;

      const { count, error } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', userId)
        .in('status', ['pending', 'accepted']);

      if (error) {
        console.error('Erreur comptage demandes envoyées:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!userId,
  });
};

// Alias pour compatibilité
export const useFollowingCount = useFollowersCount;
