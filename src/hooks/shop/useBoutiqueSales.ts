/**
 * Hook pour enregistrer les ventes en boutique physique (POS)
 * Supporte la vente multi-produits via panier
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PosCartItem } from './usePosCart';

export interface SaleInput {
  shop_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  customer_name?: string;
  payment_method?: string;
  notes?: string;
}

export interface CartSaleInput {
  shopId: string;
  items: PosCartItem[];
  customerName?: string;
  paymentMethod: string;
  notes?: string;
}

/**
 * Enregistrer une vente POS multi-produits depuis le panier
 */
export const useCreateCartSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sale: CartSaleInput) => {
      const results = [];

      for (const item of sale.items) {
        // 1. Vérifier le stock
        const { data: product, error: fetchErr } = await supabase
          .from('physical_shop_products')
          .select('stock_quantity, marketplace_quantity')
          .eq('id', item.product.id)
          .single();

        if (fetchErr || !product) throw fetchErr || new Error(`Produit introuvable: ${item.product.name}`);

        const available = product.stock_quantity - product.marketplace_quantity;
        if (item.quantity > available) {
          throw new Error(`Stock insuffisant pour "${item.product.name}". Disponible : ${available}`);
        }

        // 2. Enregistrer la vente
        const { data, error } = await (supabase as any)
          .from('physical_shop_sales')
          .insert({
            shop_id: sale.shopId,
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.product.price,
            total_amount: item.product.price * item.quantity,
            customer_name: sale.customerName || null,
            payment_method: sale.paymentMethod || 'cash',
            notes: sale.notes || null,
          })
          .select()
          .single();

        if (error) throw error;

        // 3. Décrémenter le stock
        const newStock = product.stock_quantity - item.quantity;
        const { error: updateErr } = await supabase
          .from('physical_shop_products')
          .update({
            stock_quantity: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.product.id);

        if (updateErr) throw updateErr;

        results.push(data);
      }

      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['boutique-products', variables.shopId] });
      queryClient.invalidateQueries({ queryKey: ['today-sales-stats', variables.shopId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats', variables.shopId] });
      toast.success(`${variables.items.length} article(s) vendu(s) !`);
    },
    onError: (error: any) => {
      console.error('Erreur vente POS:', error);
      toast.error(error.message || 'Erreur lors de la vente');
    },
  });
};

/**
 * Enregistrer une vente POS simple (un seul produit) - rétrocompatibilité
 */
export const useCreateBoutiqueSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sale: SaleInput) => {
      const { data: product, error: fetchErr } = await supabase
        .from('physical_shop_products')
        .select('stock_quantity, marketplace_quantity')
        .eq('id', sale.product_id)
        .single();

      if (fetchErr || !product) throw fetchErr || new Error('Produit introuvable');

      const available = product.stock_quantity - product.marketplace_quantity;
      if (sale.quantity > available) {
        throw new Error(`Stock insuffisant. Disponible : ${available}`);
      }

      const { data, error } = await (supabase as any)
        .from('physical_shop_sales')
        .insert({
          shop_id: sale.shop_id,
          product_id: sale.product_id,
          quantity: sale.quantity,
          unit_price: sale.unit_price,
          total_amount: sale.total_amount,
          customer_name: sale.customer_name || null,
          payment_method: sale.payment_method || 'cash',
          notes: sale.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newStock = product.stock_quantity - sale.quantity;
      const { error: updateErr } = await supabase
        .from('physical_shop_products')
        .update({
          stock_quantity: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sale.product_id);

      if (updateErr) throw updateErr;

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['boutique-products', variables.shop_id] });
      toast.success('Vente enregistrée !');
    },
    onError: (error: any) => {
      console.error('Erreur vente POS:', error);
      toast.error(error.message || 'Erreur lors de la vente');
    },
  });
};
