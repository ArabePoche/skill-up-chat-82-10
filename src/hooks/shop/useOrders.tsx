/**
 * Hook de gestion des commandes
 * Gère la création et le suivi des commandes
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateOrderData {
  delivery_address?: string;
  delivery_city?: string;
  delivery_postal_code?: string;
  delivery_phone?: string;
  buyer_notes?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    price: number;
    seller_id: string;
    selected_size?: string;
    selected_color?: string;
  }>;
}

export const useOrders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Créer une commande
  const createOrder = useCallback(async (orderData: CreateOrderData) => {
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Veuillez vous connecter pour passer une commande',
        variant: 'destructive',
      });
      return null;
    }

    try {
      setLoading(true);

      // Grouper les articles par vendeur
      const itemsBySeller = orderData.items.reduce((acc, item) => {
        if (!acc[item.seller_id]) {
          acc[item.seller_id] = [];
        }
        acc[item.seller_id].push(item);
        return acc;
      }, {} as Record<string, typeof orderData.items>);

      const createdOrders = [];

      // Créer une commande pour chaque vendeur
      for (const [seller_id, items] of Object.entries(itemsBySeller)) {
        const total_amount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Créer la commande
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            seller_id,
            status: 'pending',
            total_amount,
            delivery_address: orderData.delivery_address,
            delivery_city: orderData.delivery_city,
            delivery_postal_code: orderData.delivery_postal_code,
            delivery_phone: orderData.delivery_phone,
            buyer_notes: orderData.buyer_notes,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Créer les articles de commande
        const orderItems = items.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          unit_price: item.price,
          selected_size: item.selected_size,
          selected_color: item.selected_color,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;

        // Récupérer les infos de l'utilisateur pour la notification
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', user.id)
          .single();

        const userName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Un client';

        // Créer une notification pour le vendeur
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: seller_id,
            type: 'new_order',
            title: 'Nouvelle commande',
            message: `${userName || 'Un client'} a passé une commande de ${Math.round(total_amount)}€`,
            shop_order_id: order.id,
          });

        if (notifError) throw notifError;

        createdOrders.push(order);
      }

      toast({
        title: 'Commande créée',
        description: 'Votre commande a été envoyée aux vendeurs',
      });

      return createdOrders;
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la commande',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Mettre à jour le statut d'une commande
  const updateOrderStatus = useCallback(async (
    orderId: string,
    status: 'accepted' | 'rejected',
    rejectedReason?: string
  ) => {
    if (!user) return;

    try {
      const updateData: any = {
        status,
      };

      if (status === 'accepted') {
        updateData.validated_at = new Date().toISOString();
        updateData.validated_by = user.id;
      } else if (status === 'rejected' && rejectedReason) {
        updateData.buyer_notes = rejectedReason; // Utiliser buyer_notes pour stocker la raison du refus
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .eq('seller_id', user.id);

      if (error) throw error;

      // Créer une notification pour l'acheteur
      const { data: order } = await supabase
        .from('orders')
        .select('user_id, total_amount')
        .eq('id', orderId)
        .single();

      if (order) {
        await supabase
          .from('notifications')
          .insert({
            user_id: order.user_id,
            type: status === 'accepted' ? 'order_accepted' : 'order_rejected',
            title: status === 'accepted' ? 'Commande acceptée' : 'Commande refusée',
            message: status === 'accepted'
              ? `Votre commande de ${Math.round(order.total_amount)}€ a été acceptée`
              : `Votre commande de ${Math.round(order.total_amount)}€ a été refusée`,
            shop_order_id: orderId,
          });
      }

      toast({
        title: status === 'accepted' ? 'Commande acceptée' : 'Commande refusée',
        description: status === 'accepted' 
          ? 'La commande a été acceptée avec succès'
          : 'La commande a été refusée',
      });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la commande',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  return {
    createOrder,
    updateOrderStatus,
    loading,
  };
};
