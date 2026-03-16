/**
 * Hook pour gérer les fournisseurs d'une boutique physique
 * CRUD fournisseurs + commandes fournisseur + historique d'approvisionnement
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  shop_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierOrder {
  id: string;
  shop_id: string;
  supplier_id: string;
  order_number: string | null;
  status: string;
  total_amount: number;
  notes: string | null;
  ordered_at: string | null;
  received_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  items?: SupplierOrderItem[];
}

export interface SupplierOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  received_quantity: number;
  created_at: string;
}

type SupplierInput = {
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
};

type OrderInput = {
  supplier_id: string;
  order_number?: string;
  notes?: string;
  items: Array<{
    product_id?: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
};

// ─── Hook principal ──────────────────────────────────────────────

export const useSuppliers = (shopId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Liste des fournisseurs
  const suppliersQuery = useQuery({
    queryKey: ['shop-suppliers', shopId],
    queryFn: async (): Promise<Supplier[]> => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('shop_suppliers' as any)
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as unknown as Supplier[];
    },
    enabled: !!shopId && !!user,
  });

  // Créer un fournisseur
  const createSupplier = useMutation({
    mutationFn: async (input: SupplierInput) => {
      if (!shopId) throw new Error('Pas de boutique');
      const { data, error } = await supabase
        .from('shop_suppliers' as any)
        .insert({ shop_id: shopId, ...input })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-suppliers', shopId] });
      toast.success('Fournisseur ajouté');
    },
    onError: () => toast.error("Erreur lors de l'ajout du fournisseur"),
  });

  // Modifier un fournisseur
  const updateSupplier = useMutation({
    mutationFn: async ({ id, ...input }: SupplierInput & { id: string }) => {
      const { data, error } = await supabase
        .from('shop_suppliers' as any)
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-suppliers', shopId] });
      toast.success('Fournisseur mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  // Supprimer (soft delete)
  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shop_suppliers' as any)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-suppliers', shopId] });
      toast.success('Fournisseur supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  return {
    suppliers: suppliersQuery.data || [],
    isLoading: suppliersQuery.isLoading,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  };
};

// ─── Hook commandes fournisseur ──────────────────────────────────

export const useSupplierOrders = (shopId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ['supplier-orders', shopId],
    queryFn: async (): Promise<SupplierOrder[]> => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('supplier_orders' as any)
        .select('*, supplier_order_items(*)')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Récupérer les fournisseurs en parallèle
      const supplierIds = [...new Set((data || []).map((o: any) => o.supplier_id))];
      let suppliersMap: Record<string, Supplier> = {};
      if (supplierIds.length > 0) {
        const { data: suppliers } = await supabase
          .from('shop_suppliers' as any)
          .select('*')
          .in('id', supplierIds);
        suppliersMap = (suppliers || []).reduce((acc: any, s: any) => {
          acc[s.id] = s;
          return acc;
        }, {});
      }

      return (data || []).map((o: any) => ({
        ...o,
        supplier: suppliersMap[o.supplier_id] || null,
        items: o.supplier_order_items || [],
      })) as SupplierOrder[];
    },
    enabled: !!shopId && !!user,
  });

  // Créer une commande fournisseur
  const createOrder = useMutation({
    mutationFn: async (input: OrderInput) => {
      if (!shopId || !user) throw new Error('Manque contexte');
      const totalAmount = input.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

      const { data: order, error: orderError } = await supabase
        .from('supplier_orders' as any)
        .insert({
          shop_id: shopId,
          supplier_id: input.supplier_id,
          order_number: input.order_number || `CMD-${Date.now().toString(36).toUpperCase()}`,
          status: 'ordered',
          total_amount: totalAmount,
          notes: input.notes,
          ordered_at: new Date().toISOString(),
          created_by: user.id,
        })
        .select()
        .single();
      if (orderError) throw orderError;

      // Insérer les lignes
      const items = input.items.map(i => ({
        order_id: (order as any).id,
        product_id: i.product_id || null,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from('supplier_order_items' as any)
        .insert(items);
      if (itemsError) throw itemsError;

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders', shopId] });
      toast.success('Commande fournisseur créée');
    },
    onError: () => toast.error('Erreur lors de la création de la commande'),
  });

  // Réceptionner une commande (marquer comme reçue + mettre à jour le stock)
  const receiveOrder = useMutation({
    mutationFn: async ({ orderId, receivedItems }: { orderId: string; receivedItems: Array<{ itemId: string; receivedQuantity: number; productId?: string | null }> }) => {
      // Mettre à jour le statut de la commande
      const { error: orderErr } = await supabase
        .from('supplier_orders' as any)
        .update({ status: 'received', received_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (orderErr) throw orderErr;

      // Mettre à jour les quantités reçues pour chaque ligne
      for (const item of receivedItems) {
        const { error } = await supabase
          .from('supplier_order_items' as any)
          .update({ received_quantity: item.receivedQuantity })
          .eq('id', item.itemId);
        if (error) throw error;

        // Mettre à jour le stock du produit si lié à un produit boutique
        if (item.productId && item.receivedQuantity > 0) {
          // Récupérer le stock actuel
          const { data: product } = await supabase
            .from('physical_shop_products')
            .select('stock_quantity')
            .eq('id', item.productId)
            .single();

          if (product) {
            const newStock = (product.stock_quantity || 0) + item.receivedQuantity;
            const { error: stockErr } = await supabase
              .from('physical_shop_products')
              .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
              .eq('id', item.productId);
            if (stockErr) console.error('Erreur mise à jour stock:', stockErr);

            // Enregistrer le mouvement d'inventaire
            if (shopId) {
              await supabase.from('inventory_movements').insert({
                shop_id: shopId,
                product_id: item.productId,
                movement_type: 'supplier_reception',
                quantity: item.receivedQuantity,
                previous_stock: product.stock_quantity || 0,
                new_stock: newStock,
                reason: `Réception commande fournisseur #${orderId.slice(0, 8)}`,
                reference_id: orderId,
                created_by: user?.id,
              });
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders', shopId] });
      queryClient.invalidateQueries({ queryKey: ['boutique-products', shopId] });
      toast.success('Commande réceptionnée — stocks mis à jour');
    },
    onError: () => toast.error('Erreur lors de la réception'),
  });

  // Annuler une commande
  const cancelOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('supplier_orders' as any)
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders', shopId] });
      toast.success('Commande annulée');
    },
    onError: () => toast.error("Erreur lors de l'annulation"),
  });

  return {
    orders: ordersQuery.data || [],
    isLoading: ordersQuery.isLoading,
    createOrder,
    receiveOrder,
    cancelOrder,
  };
};
