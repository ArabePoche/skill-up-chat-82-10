import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * Hook pour récupérer et gérer les demandes d'adhésion de l'école
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

  // Approuver une demande via RPC
  const approveMutation = useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('approve_school_join_request', {
        p_request_id: requestId,
        p_reviewer_id: user.id,
      });

      if (error) throw error;
      
      // Vérifier si la fonction a retourné une erreur
      const result = data as any;
      if (result && !result.success) {
        throw new Error(result.error || 'Failed to approve request');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-join-requests'] });
      toast.success('Demande approuvée avec succès');
    },
    onError: (error: any) => {
      console.error('Error approving request:', error);
      toast.error(error.message || 'Erreur lors de l\'approbation');
    },
  });

  // Refuser une demande via RPC
  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('reject_school_join_request', {
        p_request_id: requestId,
        p_reviewer_id: user.id,
        p_reason: reason || null,
      });

      if (error) throw error;

      // Vérifier si la fonction a retourné une erreur
      const result = data as any;
      if (result && !result.success) {
        throw new Error(result.error || 'Failed to reject request');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-join-requests'] });
      toast.success('Demande refusée');
    },
    onError: (error: any) => {
      console.error('Error rejecting request:', error);
      toast.error(error.message || 'Erreur lors du refus');
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
