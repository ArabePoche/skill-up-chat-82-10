/**
 * Hook pour récupérer et gérer les commandes reçues par le vendeur
 * Utilisé dans la page boutique pour afficher/confirmer/rejeter les commandes marketplace
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface OrderWithDetails {
  id: string;
  status: string | null;
  total_amount: number;
  created_at: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_phone: string | null;
  buyer_notes: string | null;
  buyer: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    selected_size: string | null;
    selected_color: string | null;
    product: {
      id: string;
      name: string;
      image_url: string | null;
    } | null;
  }>;
}

export const useShopOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['shop-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, status, total_amount, created_at,
          delivery_address, delivery_city, delivery_phone, buyer_notes,
          user_id,
          order_items (
            id, quantity, price, selected_size, selected_color,
            product_id,
            products ( id, name, image_url )
          )
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Récupérer les profils des acheteurs
      const buyerIds = [...new Set((data || []).map(o => o.user_id).filter(Boolean))] as string[];
      let profilesMap: Record<string, any> = {};
      
      if (buyerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', buyerIds);
        
        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {} as Record<string, any>);
      }

      return (data || []).map(order => ({
        id: order.id,
        status: order.status,
        total_amount: order.total_amount,
        created_at: order.created_at,
        delivery_address: order.delivery_address,
        delivery_city: order.delivery_city,
        delivery_phone: order.delivery_phone,
        buyer_notes: order.buyer_notes,
        buyer: order.user_id ? profilesMap[order.user_id] || null : null,
        items: (order.order_items || []).map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          selected_size: item.selected_size,
          selected_color: item.selected_color,
          product: item.products || null,
        })),
      })) as OrderWithDetails[];
    },
    enabled: !!user,
  });

  // Écouter les nouvelles commandes en temps réel
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('shop-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `seller_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['shop-orders', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Accepter une commande
  const acceptOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'accepted',
          validated_at: new Date().toISOString(),
          validated_by: user?.id,
        })
        .eq('id', orderId)
        .eq('seller_id', user?.id);

      if (error) throw error;

      // Notifier l'acheteur
      const order = orders?.find(o => o.id === orderId);
      if (order?.buyer) {
        await supabase.from('notifications').insert({
          user_id: (order as any).buyer?.id || order.buyer?.id,
          type: 'order_accepted',
          title: 'Commande acceptée',
          message: `Votre commande de ${Math.round(order.total_amount)}€ a été acceptée`,
          shop_order_id: orderId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-orders'] });
      toast.success('Commande acceptée');
    },
    onError: () => toast.error('Erreur lors de l\'acceptation'),
  });

  // Rejeter une commande
  const rejectOrder = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'rejected',
          buyer_notes: reason || undefined,
        })
        .eq('id', orderId)
        .eq('seller_id', user?.id);

      if (error) throw error;

      const order = orders?.find(o => o.id === orderId);
      if (order?.buyer) {
        await supabase.from('notifications').insert({
          user_id: (order as any).buyer?.id || order.buyer?.id,
          type: 'order_rejected',
          title: 'Commande refusée',
          message: `Votre commande de ${Math.round(order.total_amount)}€ a été refusée${reason ? ` : ${reason}` : ''}`,
          shop_order_id: orderId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-orders'] });
      toast.success('Commande refusée');
    },
    onError: () => toast.error('Erreur lors du refus'),
  });

  const pendingOrders = orders?.filter(o => o.status === 'pending') || [];

  return {
    orders: orders || [],
    pendingOrders,
    pendingCount: pendingOrders.length,
    isLoading,
    acceptOrder: acceptOrder.mutate,
    rejectOrder: rejectOrder.mutate,
    isAccepting: acceptOrder.isPending,
    isRejecting: rejectOrder.isPending,
  };
};
