import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook pour gérer les demandes de certification
 */
export const useVerification = (userId?: string) => {
  const queryClient = useQueryClient();

  // Récupérer les demandes de certification de l'utilisateur
  const { data: verificationRequest, isLoading } = useQuery({
    queryKey: ['verification-request', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Envoyer une demande de certification
  const sendVerificationRequest = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('User ID required');

      const { error } = await supabase
        .from('verification_requests')
        .insert({
          user_id: userId,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-request', userId] });
      toast.success('Demande de certification envoyée', {
        description: 'Votre demande sera examinée par notre équipe.',
      });
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Vous avez déjà une demande en cours');
      } else {
        toast.error('Erreur lors de l\'envoi de la demande');
      }
      console.error(error);
    },
  });

  return {
    verificationRequest,
    hasPendingRequest: !!verificationRequest,
    isLoading,
    sendRequest: sendVerificationRequest.mutate,
    isSubmitting: sendVerificationRequest.isPending,
  };
};

/**
 * Hook admin pour gérer les demandes de certification
 */
export const useVerificationRequests = () => {
  const queryClient = useQueryClient();

  // Récupérer toutes les demandes de certification
  const { data: requests, isLoading } = useQuery({
    queryKey: ['verification-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verification_requests')
        .select(`
          *,
          profiles!verification_requests_user_id_fkey (
            id,
            first_name,
            last_name,
            username,
            email,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Approuver une demande
  const approveRequest = useMutation({
    mutationFn: async ({ requestId, userId }: { requestId: string; userId: string }) => {
      // Mettre à jour le profil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Mettre à jour la demande
      const { error: requestError } = await supabase
        .from('verification_requests')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (requestError) throw requestError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Demande de certification approuvée');
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'approbation');
      console.error(error);
    },
  });

  // Rejeter une demande
  const rejectRequest = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      const { error } = await supabase
        .from('verification_requests')
        .update({ 
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-requests'] });
      toast.success('Demande de certification rejetée');
    },
    onError: (error) => {
      toast.error('Erreur lors du rejet');
      console.error(error);
    },
  });

  return {
    requests,
    isLoading,
    approveRequest: approveRequest.mutate,
    rejectRequest: rejectRequest.mutate,
    isProcessing: approveRequest.isPending || rejectRequest.isPending,
  };
};
