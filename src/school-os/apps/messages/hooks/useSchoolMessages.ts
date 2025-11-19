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

  // Récupérer toutes les demandes d'adhésion pour cette école
  const { data: joinRequests = [], isLoading } = useQuery({
    queryKey: ['school-join-requests', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('school_join_requests')
        .select(`
          *,
          user:profiles!school_join_requests_user_id_fkey(
            id,
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId && !!user,
  });

  // Approuver une demande
  const approveMutation = useMutation({
    mutationFn: async ({ requestId, userId, schoolId, role }: {
      requestId: string;
      userId: string;
      schoolId: string;
      role: string;
    }) => {
      // Mettre à jour le statut de la demande
      const { error: updateError } = await supabase
        .from('school_join_requests')
        .update({ 
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // TODO: Ajouter l'utilisateur à school_members avec le rôle approprié
      
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
    mutationFn: async ({ requestId, reason }: {
      requestId: string;
      reason?: string;
    }) => {
      // Mettre à jour le statut de la demande
      const { error } = await supabase
        .from('school_join_requests')
        .update({ 
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', requestId);

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
