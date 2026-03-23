// Hook pour gérer le portefeuille multi-devises (Soumboulah Cash, Soumboulah Bonus, Habbah)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface UserWallet {
  id: string;
  user_id: string;
  soumboulah_cash: number;
  soumboulah_bonus: number;
  habbah: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  currency: 'soumboulah_cash' | 'soumboulah_bonus' | 'habbah';
  amount: number;
  transaction_type: string;
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

export const useUserWallet = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Souscrire aux changements en temps réel du portefeuille
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`wallet-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_wallets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Wallet update via realtime:', payload);
          queryClient.invalidateQueries({ queryKey: ['user-wallet'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Récupérer le portefeuille (auto-création si inexistant)
  const walletQuery = useQuery({
    queryKey: ['user-wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      let { data, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Si pas de wallet, le créer
      if (error?.code === 'PGRST116') {
        const { data: newWallet, error: insertErr } = await supabase
          .from('user_wallets')
          .insert({ user_id: user.id })
          .select()
          .single();
        if (insertErr) throw insertErr;
        return newWallet as UserWallet;
      }
      if (error) throw error;
      return data as UserWallet;
    },
    enabled: !!user?.id,
  });

  // Transactions récentes
  const transactionsQuery = useQuery({
    queryKey: ['wallet-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as WalletTransaction[];
    },
    enabled: !!user?.id,
  });

  // Convertir Habbah → Soumboulah Bonus
  const convertHabbahMutation = useMutation({
    mutationFn: async (habbahAmount: number) => {
      if (!user?.id) throw new Error('Non connecté');
      const { data, error } = await supabase.rpc('convert_habbah_to_bonus', {
        p_user_id: user.id,
        p_habbah_amount: habbahAmount,
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      toast.success(`${data.sb_earned} SB ajouté(s) à votre portefeuille !`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur de conversion');
    },
  });

  return {
    wallet: walletQuery.data,
    isLoading: walletQuery.isLoading,
    transactions: transactionsQuery.data || [],
    transactionsLoading: transactionsQuery.isLoading,
    convertHabbah: convertHabbahMutation.mutate,
    isConverting: convertHabbahMutation.isPending,
  };
};
