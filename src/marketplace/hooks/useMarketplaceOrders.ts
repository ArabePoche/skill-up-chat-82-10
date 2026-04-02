/**
 * Hook pour gérer les commandes marketplace avec système escrow
 * Gère l'achat en SC, la confirmation de réception et les litiges
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { NotificationTriggers } from '@/utils/notificationHelpers';

export interface MarketplaceOrder {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sc_amount: number;
  commission_rate: number;
  commission_amount: number;
  seller_amount: number;
  status: string;
  payment_method: string;
  shipping_address: string | null;
  tracking_number: string | null;
  buyer_confirmed_at: string | null;
  auto_release_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product?: any;
  buyer?: any;
  seller?: any;
}

/** Récupérer la config commission marketplace */
export const useMarketplaceCommissionSettings = () => {
  return useQuery({
    queryKey: ['marketplace-commission-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_commission_settings' as any)
        .select('*')
        .single();
      if (error) throw error;
      return data as any;
    },
  });
};

/** Récupérer le taux SC ↔ FCFA */
export const useScToFcfaRate = () => {
  return useQuery({
    queryKey: ['currency-conversion-settings-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currency_conversion_settings')
        .select('sc_to_fcfa_rate')
        .single();
      if (error) throw error;
      return data?.sc_to_fcfa_rate || 10;
    },
  });
};

/** Convertir un prix FCFA en SC */
export const fcfaToSc = (priceFcfa: number, rate: number): number => {
  if (!rate || rate <= 0) return 0;
  return Math.ceil(priceFcfa / rate);
};

/** Créer une commande escrow (payer en SC) */
export const useCreateMarketplaceOrder = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      productId: string;
      sellerId: string;
      quantity: number;
      unitPrice: number;
      scAmount: number;
      commissionRate: number;
      shippingAddress?: string;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('Non connecté');

      const totalAmount = input.unitPrice * input.quantity;
      const totalSc = input.scAmount * input.quantity;
      const commissionAmount = Math.round(totalSc * input.commissionRate / 100);
      const sellerAmount = totalSc - commissionAmount;
      const autoReleaseDays = 7;

      // 1. Vérifier le solde SC
      const { data: wallet, error: walletErr } = await supabase
        .from('user_wallets')
        .select('soumboulah_cash')
        .eq('user_id', user.id)
        .single();

      if (walletErr) throw walletErr;
      if (!wallet || wallet.soumboulah_cash < totalSc) {
        throw new Error(`Solde SC insuffisant. Vous avez ${wallet?.soumboulah_cash || 0} SC, il faut ${totalSc} SC.`);
      }

      // 2. Débiter le portefeuille de l'acheteur
      const { error: debitErr } = await supabase
        .from('user_wallets')
        .update({ soumboulah_cash: wallet.soumboulah_cash - totalSc })
        .eq('user_id', user.id);

      if (debitErr) throw debitErr;

      // 3. Enregistrer la transaction de débit
      const autoReleaseAt = new Date();
      autoReleaseAt.setDate(autoReleaseAt.getDate() + autoReleaseDays);

      const { data: order, error: orderErr } = await (supabase as any)
        .from('marketplace_orders')
        .insert({
          buyer_id: user.id,
          seller_id: input.sellerId,
          product_id: input.productId,
          quantity: input.quantity,
          unit_price: input.unitPrice,
          total_amount: totalAmount,
          sc_amount: totalSc,
          commission_rate: input.commissionRate,
          commission_amount: commissionAmount,
          seller_amount: sellerAmount,
          status: 'paid',
          shipping_address: input.shippingAddress || null,
          notes: input.notes || null,
          auto_release_at: autoReleaseAt.toISOString(),
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        currency: 'soumboulah_cash',
        amount: -totalSc,
        transaction_type: 'marketplace_escrow',
        description: `Achat marketplace (escrow) - ${input.quantity} article(s)`,
        reference_id: order.id,
        reference_type: 'marketplace_order',
      });

      // Notifier le vendeur
      try {
        const { data: product } = await supabase
          .from('products')
          .select('title')
          .eq('id', input.productId)
          .single();
        await NotificationTriggers.onNewMarketplaceOrder(
          input.sellerId,
          product?.title || 'Produit',
          totalSc,
          order.id,
        );
      } catch (_notifErr) {
        // Ne pas bloquer l'achat si la notification échoue
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-orders'] });
      toast.success('Commande passée ! Le paiement est sécurisé jusqu\'à confirmation.');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la commande');
    },
  });
};

/** Confirmer la réception (libère le paiement au vendeur) */
export const useConfirmReception = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!user?.id) throw new Error('Non connecté');

      // Appeler la fonction sécurisée (SECURITY DEFINER) pour créditer
      // le vendeur en contournant les restrictions RLS sur user_wallets
      const { data, error } = await supabase.rpc('confirm_marketplace_reception', {
        p_order_id: orderId,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Erreur lors de la confirmation');

      // Notifier le vendeur que le paiement a été libéré
      try {
        const { data: order } = await (supabase as any)
          .from('marketplace_orders')
          .select('seller_id, seller_amount, product:products(title)')
          .eq('id', orderId)
          .single();
        if (order) {
          const productTitle = order.product?.title || 'Produit';
          await NotificationTriggers.onOrderPaymentReleased(
            order.seller_id,
            productTitle,
            order.seller_amount,
            orderId,
          );
        }
      } catch (_notifErr) {
        // Ne pas bloquer la confirmation si la notification échoue
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-orders'] });
      toast.success('Réception confirmée ! Le vendeur a été payé.');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
};

/** Ouvrir un litige */
export const useOpenDispute = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { orderId: string; reason: string; description?: string }) => {
      if (!user?.id) throw new Error('Non connecté');

      // Mettre à jour le statut de la commande
      await (supabase as any)
        .from('marketplace_orders')
        .update({ status: 'disputed' })
        .eq('id', input.orderId);

      // Créer le litige
      const { data, error } = await (supabase as any)
        .from('marketplace_disputes')
        .insert({
          order_id: input.orderId,
          opened_by: user.id,
          reason: input.reason,
          description: input.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-orders'] });
      toast.success('Litige ouvert. Un administrateur va examiner votre demande.');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
};

/** Marquer une commande comme expédiée (vendeur) */
export const useMarkOrderShipped = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { orderId: string; trackingNumber: string }) => {
      if (!user?.id) throw new Error('Non connecté');

      const { data: order, error: fetchErr } = await (supabase as any)
        .from('marketplace_orders')
        .select('*, product:products (title)')
        .eq('id', input.orderId)
        .eq('seller_id', user.id)
        .single();

      if (fetchErr) throw fetchErr;
      if (!order) throw new Error('Commande introuvable');
      if (!['paid', 'shipped'].includes(order.status)) {
        throw new Error('Cette commande ne peut pas être mise à jour');
      }

      const { error: updateErr } = await (supabase as any)
        .from('marketplace_orders')
        .update({ status: 'shipped', tracking_number: input.trackingNumber.trim() })
        .eq('id', input.orderId);

      if (updateErr) throw updateErr;

      // Notifier l'acheteur
      try {
        await NotificationTriggers.onOrderShipped(
          order.buyer_id,
          order.product?.title || 'Produit',
          input.trackingNumber.trim(),
          input.orderId,
        );
      } catch (_notifErr) {
        // Ne pas bloquer la mise à jour si la notification échoue
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-orders'] });
      toast.success('Commande marquée comme expédiée. L\'acheteur a été notifié.');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
};

/** Récupérer mes commandes (acheteur ou vendeur) */
export const useMyMarketplaceOrders = (role: 'buyer' | 'seller' = 'buyer') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['marketplace-orders', role, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const column = role === 'buyer' ? 'buyer_id' : 'seller_id';
      const { data, error } = await (supabase as any)
        .from('marketplace_orders')
        .select(`
          *,
          product:products (id, title, image_url, price),
          buyer:profiles!marketplace_orders_buyer_id_fkey (id, first_name, last_name, avatar_url),
          seller:profiles!marketplace_orders_seller_id_fkey (id, first_name, last_name, avatar_url)
        `)
        .eq(column, user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as MarketplaceOrder[];
    },
    enabled: !!user?.id,
  });
};

/** Admin : toutes les commandes + litiges */
export const useAdminMarketplaceOrders = () => {
  return useQuery({
    queryKey: ['admin-marketplace-orders'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('marketplace_orders')
        .select(`
          *,
          product:products (id, title, image_url),
          buyer:profiles!marketplace_orders_buyer_id_fkey (id, first_name, last_name),
          seller:profiles!marketplace_orders_seller_id_fkey (id, first_name, last_name),
          disputes:marketplace_disputes (*)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data || []) as any[];
    },
  });
};

/** Admin : mettre à jour la config commission */
export const useUpdateMarketplaceCommission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: { commission_rate: number; auto_release_days: number; min_order_amount: number }) => {
      const { error } = await (supabase as any)
        .from('marketplace_commission_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // update all rows

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-commission-settings'] });
      toast.success('Configuration marketplace mise à jour');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
};

/** Admin : résoudre un litige */
export const useResolveDispute = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      disputeId: string;
      orderId: string;
      resolution: 'refund' | 'release';
      adminNotes?: string;
    }) => {
      if (!user?.id) throw new Error('Non connecté');

      // Récupérer la commande
      const { data: order, error: fetchErr } = await (supabase as any)
        .from('marketplace_orders')
        .select('*')
        .eq('id', input.orderId)
        .single();

      if (fetchErr) throw fetchErr;

      if (input.resolution === 'refund') {
        // Rembourser l'acheteur
        const { data: buyerWallet } = await supabase
          .from('user_wallets')
          .select('soumboulah_cash')
          .eq('user_id', order.buyer_id)
          .single();

        await supabase
          .from('user_wallets')
          .update({ soumboulah_cash: (buyerWallet?.soumboulah_cash || 0) + order.sc_amount })
          .eq('user_id', order.buyer_id);

        await supabase.from('wallet_transactions').insert({
          user_id: order.buyer_id,
          currency: 'soumboulah_cash',
          amount: order.sc_amount,
          transaction_type: 'marketplace_refund',
          description: 'Remboursement suite à litige marketplace',
          reference_id: input.orderId,
          reference_type: 'marketplace_order',
        });

        await (supabase as any)
          .from('marketplace_orders')
          .update({ status: 'refunded', completed_at: new Date().toISOString() })
          .eq('id', input.orderId);
      } else {
        // Libérer au vendeur
        const { data: sellerWallet } = await supabase
          .from('user_wallets')
          .select('soumboulah_cash')
          .eq('user_id', order.seller_id)
          .single();

        await supabase
          .from('user_wallets')
          .update({ soumboulah_cash: (sellerWallet?.soumboulah_cash || 0) + order.seller_amount })
          .eq('user_id', order.seller_id);

        await supabase.from('wallet_transactions').insert({
          user_id: order.seller_id,
          currency: 'soumboulah_cash',
          amount: order.seller_amount,
          transaction_type: 'marketplace_sale',
          description: `Vente marketplace libérée après litige (commission ${order.commission_rate}%)`,
          reference_id: input.orderId,
          reference_type: 'marketplace_order',
        });

        await (supabase as any)
          .from('marketplace_orders')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', input.orderId);
      }

      // Mettre à jour le litige
      const disputeStatus = input.resolution === 'refund' ? 'resolved_refund' : 'resolved_release';
      await (supabase as any)
        .from('marketplace_disputes')
        .update({
          status: disputeStatus,
          admin_notes: input.adminNotes || null,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', input.disputeId);

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketplace-orders'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-orders'] });
      toast.success('Litige résolu avec succès');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
};
