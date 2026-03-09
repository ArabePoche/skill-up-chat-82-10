/**
 * Hook pour gérer le chat inter-boutiques
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface ShopMessage {
  id: string;
  sender_id: string;
  sender_shop_id: string;
  receiver_shop_id: string;
  content: string;
  transfer_id: string | null;
  created_at: string;
  is_read: boolean;
  sender_shop?: {
    name: string;
  };
  receiver_shop?: {
    name: string;
  };
  transfer?: {
    id: string;
    status: string;
    quantity: number;
    product_name: string;
  };
}

export interface ShopConversation {
  shop_id: string;
  shop_name: string;
  last_message?: ShopMessage;
  unread_count: number;
}

/**
 * Récupérer les conversations entre boutiques
 */
export const useShopConversations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['shop-conversations', user?.id],
    queryFn: async (): Promise<ShopConversation[]> => {
      if (!user?.id) return [];

      // Récupérer toutes les boutiques de l'utilisateur
      const { data: userShops, error: shopsError } = await supabase
        .from('physical_shops')
        .select('id, name')
        .eq('owner_id', user.id);

      if (shopsError) throw shopsError;
      if (!userShops || userShops.length === 0) return [];

      const userShopIds = userShops.map(s => s.id);

      // Récupérer les messages récents pour chaque conversation
      const { data: messages, error: messagesError } = await supabase
        .from('shop_messages')
        .select(`
          *,
          sender_shop:physical_shops!sender_shop_id(name),
          receiver_shop:physical_shops!receiver_shop_id(name)
        `)
        .or(`sender_shop_id.in.(${userShopIds.join(',')}),receiver_shop_id.in.(${userShopIds.join(',')})`)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Grouper par conversation (paire de boutiques)
      const conversationsMap = new Map<string, ShopConversation>();

      (messages || []).forEach(message => {
        const isFromUser = userShopIds.includes(message.sender_shop_id);
        const otherShopId = isFromUser ? message.receiver_shop_id : message.sender_shop_id;
        const otherShopName = isFromUser 
          ? message.receiver_shop?.name || 'Boutique inconnue'
          : message.sender_shop?.name || 'Boutique inconnue';

        const conversationKey = otherShopId;

        if (!conversationsMap.has(conversationKey)) {
          conversationsMap.set(conversationKey, {
            shop_id: otherShopId,
            shop_name: otherShopName,
            last_message: message as ShopMessage,
            unread_count: 0,
          });
        }

        // Compter les messages non lus (reçus par l'utilisateur)
        if (!isFromUser && !message.is_read) {
          const conv = conversationsMap.get(conversationKey)!;
          conv.unread_count++;
        }
      });

      return Array.from(conversationsMap.values());
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 secondes
  });
};

/**
 * Récupérer les messages d'une conversation spécifique
 */
export const useShopMessages = (senderShopId: string, receiverShopId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['shop-messages', senderShopId, receiverShopId],
    queryFn: async (): Promise<ShopMessage[]> => {
      if (!senderShopId || !receiverShopId) return [];

      const { data, error } = await supabase
        .from('shop_messages')
        .select(`
          *,
          sender_shop:physical_shops!sender_shop_id(name),
          receiver_shop:physical_shops!receiver_shop_id(name),
          transfer:shop_stock_transfers(id, status, quantity, product_name:physical_shop_products(name))
        `)
        .or(
          `and(sender_shop_id.eq.${senderShopId},receiver_shop_id.eq.${receiverShopId}),` +
          `and(sender_shop_id.eq.${receiverShopId},receiver_shop_id.eq.${senderShopId})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(msg => ({
        ...msg,
        transfer: msg.transfer ? {
          ...msg.transfer,
          product_name: msg.transfer.product_name?.name || 'Produit inconnu'
        } : null
      })) as ShopMessage[];
    },
    enabled: !!(senderShopId && receiverShopId),
    staleTime: 1000 * 30,
  });

  // S'abonner aux nouveaux messages en temps réel
  useEffect(() => {
    if (!senderShopId || !receiverShopId) return;

    const channel = supabase
      .channel('shop_messages')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'shop_messages',
          filter: `sender_shop_id=in.(${senderShopId},${receiverShopId})`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['shop-messages', senderShopId, receiverShopId] });
          queryClient.invalidateQueries({ queryKey: ['shop-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [senderShopId, receiverShopId, queryClient]);

  return query;
};

/**
 * Envoyer un message
 */
export const useSendShopMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      senderShopId,
      receiverShopId,
      content,
      transferId,
    }: {
      senderShopId: string;
      receiverShopId: string;
      content: string;
      transferId?: string;
    }) => {
      if (!user?.id) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('shop_messages')
        .insert({
          sender_id: user.id,
          sender_shop_id: senderShopId,
          receiver_shop_id: receiverShopId,
          content,
          transfer_id: transferId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['shop-messages', variables.senderShopId, variables.receiverShopId] 
      });
      queryClient.invalidateQueries({ queryKey: ['shop-conversations'] });
    },
    onError: (error: any) => {
      console.error('Erreur envoi message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    },
  });
};

/**
 * Marquer des messages comme lus
 */
export const useMarkMessagesAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      receiverShopId,
      senderShopId,
    }: {
      receiverShopId: string;
      senderShopId: string;
    }) => {
      const { error } = await supabase
        .from('shop_messages')
        .update({ is_read: true })
        .eq('receiver_shop_id', receiverShopId)
        .eq('sender_shop_id', senderShopId)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-conversations'] });
    },
  });
};

/**
 * Obtenir le nombre total de messages non lus
 */
export const useUnreadShopMessagesCount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unread-shop-messages-count', user?.id],
    queryFn: async (): Promise<number> => {
      if (!user?.id) return 0;

      // Récupérer les boutiques de l'utilisateur
      const { data: userShops } = await supabase
        .from('physical_shops')
        .select('id')
        .eq('owner_id', user.id);

      if (!userShops || userShops.length === 0) return 0;

      const userShopIds = userShops.map(s => s.id);

      // Compter les messages non lus destinés à ces boutiques
      const { count } = await supabase
        .from('shop_messages')
        .select('*', { count: 'exact', head: true })
        .in('receiver_shop_id', userShopIds)
        .eq('is_read', false);

      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  });
};