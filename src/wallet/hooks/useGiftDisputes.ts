import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { NotificationTriggers } from '@/utils/notificationHelpers';

export const useAdminGiftDisputes = () => {
  return useQuery({
    queryKey: ['admin_gift_disputes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_cancellation_claims' as any)
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
      const { data, error } = await supabase.rpc('create_gift_cancellation_claim' as any, {
        p_transaction_ref: input.transactionRef,
        p_reason: input.reason
      });

      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.message || 'Erreur lors de la création de la réclamation');

      let claimDetails: { recipient_id: string; amount: number; currency: string } | null = null;
      if (result.claim_id) {
        const { data: claim } = await supabase
          .from('gift_cancellation_claims' as any)
          .select('recipient_id, amount, currency')
          .eq('id', result.claim_id)
          .single();
        claimDetails = claim as any;
      }

      return { ...result, claimDetails };
    },
    onSuccess: (data: any) => {
      toast.success('Réclamation envoyée et fonds bloqués');
      if (data.claimDetails) {
        NotificationTriggers.onGiftClaimCreated(
          data.claimDetails.recipient_id,
          data.claimDetails.amount,
          data.claimDetails.currency
        ).catch(console.error);
      }
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
    mutationFn: async (input: {
      claimId: string;
      action: 'approve' | 'reject';
      adminNotes: string;
      senderId: string;
      recipientId: string;
      amount: number;
      currency: string;
    }) => {
      const { data, error } = await supabase.rpc('resolve_gift_cancellation_claim' as any, {
        p_claim_id: input.claimId,
        p_action: input.action,
        p_admin_notes: input.adminNotes
      });

      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.message || 'Erreur lors de la résolution');
      
      return { ...result, input };
    },
    onSuccess: (data: any) => {
      toast.success('Réclamation traitée avec succès');
      const { senderId, recipientId, action, amount, currency, adminNotes } = data.input;
      // Utiliser full_amount retourné par la RPC (montant brut envoyé) au lieu de amount (montant net reçu)
      const refundAmount = data.full_amount || amount;
      NotificationTriggers.onGiftClaimDecision(
        senderId, recipientId, action, refundAmount, currency, adminNotes
      ).catch(console.error);
      queryClient.invalidateQueries({ queryKey: ['admin_gift_disputes'] });
      queryClient.invalidateQueries({ queryKey: ['wallet_history'] });
      queryClient.invalidateQueries({ queryKey: ['wallet_balance'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Impossible de traiter la réclamation');
    }
  });
};
