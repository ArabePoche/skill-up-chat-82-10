/**
 * Hook pour gérer les fournisseurs d'une boutique physique
 * CRUD fournisseurs + commandes fournisseur + historique d'approvisionnement
 * — Offline-first : listes via useOfflineQuery, réception de commande via useOfflineMutation
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useOfflineQuery } from '@/offline/hooks/useOfflineQuery';
import { useOfflineMutation } from '@/offline/hooks/useOfflineMutation';

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

  // Liste des fournisseurs (offline-first)
  const suppliersQuery = useOfflineQuery<Supplier[]>({
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

  const ordersQuery = useOfflineQuery<SupplierOrder[]>({
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

  // Réceptionner une commande (marquer comme reçue + créer des lots)
  // Offline-first : mise en file d'attente si hors-ligne, mise à jour optimiste immédiate
  const receiveOrder = useOfflineMutation<
    void,
    { orderId: string; receivedItems: Array<{ itemId: string; receivedQuantity: number; productId: string; sectorData?: any }> }
  >({
    mutationType: 'generic',
    invalidateKeys: [
      ['supplier-orders', shopId],
      ['boutique-products', shopId],
    ],
    optimisticUpdate: ({ orderId, receivedItems }) => {
      // Mise à jour optimiste immédiate du cache : marquer la commande comme "received"
      const nowIso = new Date().toISOString();
      const cachedOrders = queryClient.getQueryData<SupplierOrder[]>(['supplier-orders', shopId]);
      if (cachedOrders) {
        const updated = cachedOrders.map(o =>
          o.id === orderId
            ? {
                ...o,
                status: 'received',
                received_at: nowIso,
                updated_at: nowIso,
                items: o.items?.map(it => {
                  const ri = receivedItems.find(r => r.itemId === it.id);
                  return ri ? { ...it, received_quantity: ri.receivedQuantity } : it;
                }),
              }
            : o
        );
        queryClient.setQueryData(['supplier-orders', shopId], updated);
      }
      // Optimistic stock bump pour la liste des produits
      const cachedProducts = queryClient.getQueryData<any[]>(['boutique-products', shopId]);
      if (cachedProducts) {
        const updated = cachedProducts.map(p => {
          const ri = receivedItems.find(r => r.productId === p.id);
          if (!ri) return p;
          return { ...p, stock_quantity: (p.stock_quantity || 0) + ri.receivedQuantity };
        });
        queryClient.setQueryData(['boutique-products', shopId], updated);
      }
    },
    mutationFn: async ({ orderId, receivedItems }) => {
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

        // Créer un lot pour chaque produit reçu
        if (item.productId && item.receivedQuantity > 0) {
          // Récupérer le stock actuel du produit
          const { data: product } = await supabase
            .from('physical_shop_products')
            .select('stock_quantity')
            .eq('id', item.productId)
            .single();

          if (product) {
            // Générer un numéro de lot automatiquement
            const { data: batchNumber } = await supabase.rpc('generate_batch_number', {
              p_shop_id: shopId,
              p_product_id: item.productId,
            });

            // Extraire la date d'expiration des sector_data
            const expiryDate = item.sectorData?.expiry_date || item.sectorData?.expiration_date || null;

            // Créer le lot
            const { error: batchErr } = await supabase
              .from('product_batches')
              .insert({
                shop_id: shopId,
                product_id: item.productId,
                batch_number: batchNumber || `LOT-${Date.now()}`,
                quantity: item.receivedQuantity,
                expiry_date: expiryDate,
                sector_data: item.sectorData || {},
                supplier_order_id: orderId,
              });

            if (batchErr) {
              console.error('Erreur création lot:', batchErr);
              throw batchErr;
            }

            // Mettre à jour le stock du produit (stock total = somme de tous les lots)
            const { data: batches } = await supabase
              .from('product_batches')
              .select('quantity')
              .eq('product_id', item.productId);

            const newStock = batches?.reduce((sum: number, b: any) => sum + b.quantity, 0) || item.receivedQuantity;

            const { error: stockErr } = await supabase
              .from('physical_shop_products')
              .update({ 
                stock_quantity: newStock,
                updated_at: new Date().toISOString() 
              })
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
                reason: `Réception commande fournisseur #${orderId.slice(0, 8)} - Lot ${batchNumber}`,
                reference_id: orderId,
                created_by: user?.id,
              });
            }
          }
        }
      }
    },
    onSuccess: () => {
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
