/**
 * Hook de gestion du panier
 * Gère l'ajout, la suppression et le comptage des articles du panier
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  added_at: string;
}

export const useCart = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Charger les articles du panier
  const loadCart = useCallback(async () => {
    if (!user) {
      setCartItems([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setCartItems(data || []);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Charger le panier au montage et quand l'utilisateur change
  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // Écouter les changements en temps réel sur le panier
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('cart-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadCart();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadCart]);

  // Ajouter un produit au panier
  const addToCart = useCallback(async (productId: string) => {
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Veuillez vous connecter pour ajouter des produits au panier',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Vérifier si le produit est déjà dans le panier
      const existingItem = cartItems.find(item => item.product_id === productId);

      if (existingItem) {
        // Incrémenter la quantité
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);

        if (error) throw error;
        
        // Mise à jour optimiste immédiate
        setCartItems(prev => 
          prev.map(item => 
            item.id === existingItem.id 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      } else {
        // Ajouter un nouvel article
        const { data, error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: productId,
            quantity: 1,
          })
          .select()
          .single();

        if (error) throw error;
        
        // Mise à jour optimiste immédiate
        if (data) {
          setCartItems(prev => [...prev, data]);
        }
      }

      toast({
        title: 'Produit ajouté',
        description: 'Le produit a été ajouté à votre panier',
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      // En cas d'erreur, recharger pour synchroniser
      await loadCart();
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter le produit au panier',
        variant: 'destructive',
      });
    }
  }, [user, cartItems, loadCart, toast]);

  // Retirer un produit du panier
  const removeFromCart = useCallback(async (cartItemId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadCart();

      toast({
        title: 'Produit retiré',
        description: 'Le produit a été retiré de votre panier',
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de retirer le produit du panier',
        variant: 'destructive',
      });
    }
  }, [user, loadCart, toast]);

  // Mettre à jour la quantité d'un article
  const updateQuantity = useCallback(async (cartItemId: string, newQuantity: number) => {
    if (!user || newQuantity < 1) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', cartItemId)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier la quantité',
        variant: 'destructive',
      });
    }
  }, [user, loadCart, toast]);

  // Vider le panier
  const clearCart = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setCartItems([]);

      toast({
        title: 'Panier vidé',
        description: 'Votre panier a été vidé',
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de vider le panier',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  return {
    cartItems,
    cartItemsCount: cartItems.length,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    refreshCart: loadCart,
  };
};
 