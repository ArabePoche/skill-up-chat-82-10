import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * Hook pour récupérer les demandes d'adhésion et messages de l'école
 */
export const useSchoolMessages = (schoolId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer toutes les notifications de type school_join_request pour cette école
  const { data: joinRequests = [], isLoading } = useQuery({
    queryKey: ['school-join-requests', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:profiles!notifications_sender_id_fkey(
            id,
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq('type', 'school_join_request')
        .ilike('message', `%École: ${schoolId}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId && !!user,
  });

  // Approuver une demande
  const approveMutation = useMutation({
    mutationFn: async ({ notificationId, userId, schoolId, role }: {
      notificationId: string;
      userId: string;
      schoolId: string;
      role: string;
    }) => {
      // Marquer la notification comme lue
      const { error: notifError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (notifError) throw notifError;

      // TODO: Ajouter l'utilisateur à l'école avec le rôle approprié
      // Pour l'instant on marque juste comme lu
      
      toast.success('Demande approuvée');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-join-requests'] });
    },
    onError: (error) => {
      console.error('Error approving request:', error);
      toast.error('Erreur lors de l\'approbation');
    },
  });

  // Refuser une demande
  const rejectMutation = useMutation({
    mutationFn: async ({ notificationId, reason }: {
      notificationId: string;
      reason?: string;
    }) => {
      // Supprimer la notification ou la marquer comme refusée
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      
      toast.success('Demande refusée');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-join-requests'] });
    },
    onError: (error) => {
      console.error('Error rejecting request:', error);
      toast.error('Erreur lors du refus');
    },
  });

  return {
    joinRequests,
    isLoading,
    approveRequest: approveMutation.mutate,
    rejectRequest: rejectMutation.mutate,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
};
