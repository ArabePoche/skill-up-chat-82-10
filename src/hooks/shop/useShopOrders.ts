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

export const useShopOrders = (shopId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['shop-orders', user?.id, shopId],
    queryFn: async () => {
      if (!user) return [];

      console.log('📦 [useShopOrders] Fetching orders:', { userId: user.id, shopId });

      let query = supabase
        .from('orders')
        .select(`
          id, status, total_amount, created_at,
          delivery_address, delivery_city, delivery_phone, buyer_notes,
          user_id,
          order_items (
            id, quantity, price, selected_size, selected_color,
            product_id,
            products ( id, title, image_url )
          )
        `)
        .order('created_at', { ascending: false });

      if (shopId) {
        // Filtrer par boutique si spécifié (ex: vue caissier/vendeur)
        query = query.eq('shop_id' as any, shopId);
      } else {
        // Sinon filtrer par vendeur (vue propriétaire global)
        query = query.eq('seller_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [useShopOrders] Error fetching orders:', error);
        throw error;
      }

      console.log('✅ [useShopOrders] Found', data?.length || 0, 'orders');

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
          product: item.products ? {
            id: item.products.id,
            name: item.products.title,
            image_url: item.products.image_url
          } : null,
        })),
      })) as OrderWithDetails[];
    },
    enabled: !!user,
  });

  // Écouter les nouvelles commandes en temps réel
  useEffect(() => {
    if (!user) return;

    const channelFilter = shopId
      ? `shop_id=eq.${shopId}`
      : `seller_id=eq.${user.id}`;

    const channel = supabase
      .channel(shopId ? `shop-orders-${shopId}` : 'shop-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: channelFilter,
        },
        (payload) => {
          // Jouer un son si c'est une nouvelle commande
          if (payload.eventType === 'INSERT') {
            const audio = new Audio('/sounds/notification-order.mp3');
            audio.play().catch(e => console.error('Error playing sound:', e));
            toast.success('Nouvelle commande reçue !', {
              duration: 5000,
              action: {
                label: 'Voir',
                onClick: () => window.location.reload() // Ou navigation si possible, mais le refresh query suffit
              }
            });
          }
          queryClient.invalidateQueries({ queryKey: ['shop-orders', user.id, shopId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, shopId]);

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
