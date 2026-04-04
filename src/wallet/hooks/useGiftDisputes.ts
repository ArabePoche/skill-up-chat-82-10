import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useAdminGiftDisputes = () => {
  return useQuery({
    queryKey: ['admin_gift_disputes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_cancellation_claims')
        .select(`
          *,
          sender:profiles!gift_cancellation_claims_sender_id_fkey(id, first_name, last_name, avatar_url),
          recipient:profiles!gift_cancellation_claims_recipient_id_fkey(id, first_name, last_name, avatar_url),
          resolver:profiles!gift_cancellation_claims_resolved_by_fkey(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur chargement réclamations:', error);
        throw error;
      }
      return data || [];
    }
  });
};

export const useCreateGiftDispute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { transactionRef: string; reason: string }) => {
      const { data, error } = await supabase.rpc('create_gift_cancellation_claim', {
        p_transaction_ref: input.transactionRef,
        p_reason: input.reason
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Erreur lors de la création de la réclamation');

      return data;
    },
    onSuccess: () => {
      toast.success('Réclamation envoyée et fonds bloqués');
      queryClient.invalidateQueries({ queryKey: ['wallet_history'] });
      queryClient.invalidateQueries({ queryKey: ['wallet_balance'] });
      queryClient.invalidateQueries({ queryKey: ['admin_gift_disputes'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Impossible de créer la réclamation');
    }
  });
};

export const useResolveGiftDispute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { claimId: string; action: 'approve' | 'reject'; adminNotes: string }) => {
      const { data, error } = await supabase.rpc('resolve_gift_cancellation_claim', {
        p_claim_id: input.claimId,
        p_action: input.action,
        p_admin_notes: input.adminNotes
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Erreur lors de la résolution');
      
      return data;
    },
    onSuccess: () => {
      toast.success('Réclamation traitée avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin_gift_disputes'] });
      queryClient.invalidateQueries({ queryKey: ['wallet_history'] });
      queryClient.invalidateQueries({ queryKey: ['wallet_balance'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Impossible de traiter la réclamation');
    }
  });
};
