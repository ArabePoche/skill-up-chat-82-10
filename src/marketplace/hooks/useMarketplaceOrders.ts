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
        .maybeSingle();

      if (error) {
        console.error('Erreur récupération taux SC:', error);
        return 1;
      }
      return data?.sc_to_fcfa_rate || 1;
    },
  });
};

/** Convertir un prix FCFA en SC */
export const fcfaToSc = (priceFcfa: number, rate: number): number => {
  if (!rate || rate <= 0) return 0;
  return priceFcfa / rate;
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

      // Appeler la fonction sécurisée (SECURITY DEFINER) pour débiter le portefeuille
      // de l'acheteur et créer la commande (contourne les restrictions RLS sur user_wallets)
      const { data, error } = await supabase.rpc('create_marketplace_order' as any, {
        p_product_id: input.productId,
        p_seller_id: input.sellerId,
        p_quantity: input.quantity,
        p_unit_price: input.unitPrice,
        p_sc_amount: input.scAmount,
        p_commission_rate: input.commissionRate,
        p_shipping_address: input.shippingAddress || null,
        p_notes: input.notes || null,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Erreur lors de la commande');

      const order = data.order;

      // Notifier le vendeur
      try {
        const { data: product } = await supabase
          .from('products')
          .select('title')
          .eq('id', input.productId)
          .single();
          
        const buyerName = user?.user_metadata?.first_name || user?.user_metadata?.full_name || 'Un utilisateur';
        
        await NotificationTriggers.onNewMarketplaceOrder(
          input.sellerId,
          product?.title || 'Produit',
          input.scAmount * input.quantity,
          order.id,
          buyerName
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
      const result = data as any;
      if (!result?.success) throw new Error(result?.message || 'Erreur lors de la confirmation');

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
          seller:profiles!marketplace_orders_seller_id_fkey (id, first_name, last_name, avatar_url),
          disputes:marketplace_disputes (id, reason, description, status, admin_decision, admin_notes, resolved_at)
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

      // Appel de la procédure stockée sécurisée pour résoudre le litige
      const { data, error } = await supabase.rpc('resolve_marketplace_dispute', {
        p_dispute_id: input.disputeId,
        p_order_id: input.orderId,
        p_resolution: input.resolution,
        p_admin_notes: input.adminNotes || null,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Erreur lors de la résolution');

      // Récupérer la commande avec le produit pour les notifications
      const { data: order, error: fetchErr } = await (supabase as any)
        .from('marketplace_orders')
        .select('*, product:products (title)')
        .eq('id', input.orderId)
        .single();

      if (!fetchErr && order) {
        if (input.resolution === 'refund') {
          // Notifier l'acheteur et le vendeur du remboursement
          try {
            await NotificationTriggers.onDisputeRefunded(
              order.buyer_id,
              order.seller_id,
              order.product?.title || 'Produit',
              order.sc_amount,
              input.orderId,
              input.adminNotes,
            );
          } catch (_notifErr) {
            // Ne pas bloquer si la notification échoue
          }
        } else {
          // Notifier le vendeur et l'acheteur de la libération du paiement
          try {
            await NotificationTriggers.onDisputeReleased(
              order.seller_id,
              order.buyer_id,
              order.product?.title || 'Produit',
              order.seller_amount,
              input.orderId,
              input.adminNotes,
            );
          } catch (_notifErr) {
            // Ne pas bloquer si la notification échoue
          }
        }
      }

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
