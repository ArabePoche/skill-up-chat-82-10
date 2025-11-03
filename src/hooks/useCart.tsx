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
      } else {
        // Ajouter un nouvel article
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: productId,
            quantity: 1,
          });

        if (error) throw error;
      }

      // Recharger le panier
      await loadCart();

      toast({
        title: 'Produit ajouté',
        description: 'Le produit a été ajouté à votre panier',
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
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
    clearCart,
    refreshCart: loadCart,
  };
};
