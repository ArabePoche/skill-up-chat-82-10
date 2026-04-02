/**
 * Hook pour enregistrer les ventes en boutique physique (POS)
 * Supporte la vente multi-produits via panier
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { boutiqueProductStore } from '@/local-storage/stores/BoutiqueStore';
import { offlineStore } from '@/offline/utils/offlineStore';
import { toast } from 'sonner';
import type { PosCartItem } from './usePosCart';
import { logShopActivity } from './useShopActivityLogs';

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
  agentId?: string; // ID de l'agent qui effectue la vente
  receiptId?: string; // Identifiant de la facture / du ticket commun
}

/**
 * Enregistrer une vente POS multi-produits depuis le panier
 */
export const useCreateCartSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sale: CartSaleInput) => {
      // 1. Mise à jour locale du stock (optimiste)
      for (const item of sale.items) {
        const existing = await boutiqueProductStore.get(item.product.id);
        if (existing) {
          await boutiqueProductStore.put({
            ...existing,
            stockQuantity: existing.stockQuantity - item.quantity,
            updatedAt: Date.now()
          });
        }
      }

      // 2. Gestion Offline
      if (!navigator.onLine) {
        console.log('📵 App status: offline. Queueing sale mutation.');
        await offlineStore.addPendingMutation({
          type: 'create_boutique_sale',
          payload: sale
        });
        return { success: true, offline: true };
      }

      // 3. Mode Online
      console.log('🌐 App status: online. Syncing sale with Supabase.');
      const results = [];
      for (const item of sale.items) {
        // Enregistrer la vente
        const { data, error: saleErr } = await (supabase as any)
          .from('physical_shop_sales')
          .insert({
            shop_id: sale.shopId,
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.product.price,
            total_amount: item.product.price * item.quantity,
            cost_price: item.product.cost_price || 0,
            customer_name: sale.customerName || null,
            payment_method: sale.paymentMethod || 'cash',
            notes: sale.notes || null,
            agent_id: sale.agentId || null,
            receipt_id: sale.receiptId || null,
          })
          .select()
          .single();

        if (saleErr) throw saleErr;

        // Mettre à jour le stock sur le serveur
        const { data: product, error: fetchErr } = await supabase
          .from('physical_shop_products')
          .select('stock_quantity')
          .eq('id', item.product.id)
          .single();

        if (fetchErr) throw fetchErr;

        const newStock = (product.stock_quantity || 0) - item.quantity;
        const { error: updateErr } = await supabase
          .from('physical_shop_products')
          .update({ stock_quantity: newStock })
          .eq('id', item.product.id);

        if (updateErr) throw updateErr;

        results.push(data);
      }

      // Record activity log
      const totalAmount = sale.items.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
      await logShopActivity({
        shopId: sale.shopId,
        agentId: sale.agentId,
        actionType: 'SALE',
        details: `Enregistrement d'une vente de ${totalAmount} FCFA (Client: ${sale.customerName || 'Anonyme'}${sale.receiptId ? `, Référence: ${sale.receiptId}` : ''}). Articles : ` + sale.items.map(item => `${item.quantity}x ${item.product.name}`).join(', '),
      });

      return results;
    },
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['boutique-products', variables.shopId] });
      queryClient.invalidateQueries({ queryKey: ['today-sales-stats', variables.shopId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats', variables.shopId] });
      queryClient.invalidateQueries({ queryKey: ['boutique-sales-history', variables.shopId] });

      const isOffline = data && data.offline;
      toast.success(
        isOffline
          ? `${variables.items.length} article(s) vendus (hors ligne) !`
          : `${variables.items.length} article(s) vendus !`
      );
    },
    onError: (error: any) => {
      console.error('Erreur vente POS:', error);
      toast.error(error.message || 'Erreur lors de la vente');
    },
  });
};

/**
 * Récupérer l'historique des ventes
 */
export const useBoutiqueSalesHistory = (shopId?: string) => {
  return useQuery({
    queryKey: ['boutique-sales-history', shopId],
    queryFn: async () => {
      if (!shopId) return [];

      const { data, error } = await supabase
        .from('physical_shop_sales' as any)
        .select(`
          *,
          product:physical_shop_products (
            name,
            image_url
          ),
          agent:shop_agents (
            first_name,
            last_name
          )
        `)
        .eq('shop_id', shopId)
        .order('sold_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!shopId,
  });
};

/**
 * Annuler une vente et restaurer le stock
 */
export const useCancelBoutiqueSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sale: { id: string; shop_id: string; product_id: string; quantityToReturn: number; originalQuantity: number; originalTotalAmount: number }) => {
      // 1. Mise à jour locale du stock (optimiste)
      const existing = await boutiqueProductStore.get(sale.product_id);
      if (existing) {
        await boutiqueProductStore.put({
          ...existing,
          stockQuantity: existing.stockQuantity + sale.quantityToReturn,
          updatedAt: Date.now()
        });
      }

      // 2. Gestion Offline
      if (!navigator.onLine) {
        console.log('📵 App status: offline. Queueing cancel mutation.');
        await offlineStore.addPendingMutation({
          type: 'cancel_boutique_sale',
          payload: sale
        });
        return { id: sale.id, offline: true };
      }

      // 3. Mode Online
      console.log('🌐 App status: online. Syncing cancel with Supabase.');

      if (sale.quantityToReturn === sale.originalQuantity) {
        // Annulation complète
        const { error: cancelError } = await supabase
          .from('physical_shop_sales' as any)
          .update({ status: 'canceled' })
          .eq('id', sale.id);
        if (cancelError) throw cancelError;
      } else {
        // Retour partiel (diminution de quantité)
        const newQuantity = sale.originalQuantity - sale.quantityToReturn;
        const newTotalAmount = (sale.originalTotalAmount / sale.originalQuantity) * newQuantity;
        
        const { error: updateSaleError } = await supabase
          .from('physical_shop_sales' as any)
          .update({ quantity: newQuantity, total_amount: newTotalAmount })
          .eq('id', sale.id);
        if (updateSaleError) throw updateSaleError;
      }

      // Restaurer le stock sur le serveur
      const { data: product, error: fetchErr } = await supabase
        .from('physical_shop_products')
        .select('stock_quantity')
        .eq('id', sale.product_id)
        .single();

      if (fetchErr) throw fetchErr;

      const newStock = (product.stock_quantity || 0) + sale.quantityToReturn;
      const { error: updateErr } = await supabase
        .from('physical_shop_products')
        .update({ stock_quantity: newStock })
        .eq('id', sale.product_id);

      if (updateErr) throw updateErr;

      // Log cancellation
      const statusText = sale.quantityToReturn === sale.originalQuantity ? 'Annulation complète' : `Retour partiel (${sale.quantityToReturn} sur ${sale.originalQuantity})`;
      await logShopActivity({
        shopId: sale.shop_id,
        actionType: 'CANCEL_SALE',
        details: `${statusText} pour l'article ${sale.product_id ? sale.product_id.substring(0, 8) : 'inconnu'} avec remboursement de la quantité.`,
      });

      return { id: sale.id };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['boutique-sales-history', variables.shop_id] });
      queryClient.invalidateQueries({ queryKey: ['boutique-products', variables.shop_id] });
      queryClient.invalidateQueries({ queryKey: ['today-sales-stats', variables.shop_id] });
      toast.success('Vente annulée avec succès.');
    },
    onError: (error: any) => {
      console.error('Erreur annulation vente:', error);
      toast.error("Erreur lors de l'annulation de la vente");
    },
  });
};
