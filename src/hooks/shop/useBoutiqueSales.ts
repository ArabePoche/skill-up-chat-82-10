/**
 * Hook pour enregistrer les ventes en boutique physique (POS)
 * Utilise la table physical_shop_sales
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

/**
 * Enregistrer une vente POS et décrémenter le stock
 */
export const useCreateBoutiqueSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sale: SaleInput) => {
      // 1. Vérifier le stock disponible
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

      // 2. Enregistrer la vente
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

      // 3. Décrémenter le stock
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
