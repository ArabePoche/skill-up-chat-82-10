/**
 * Hook pour gérer les transferts de stock entre boutiques
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { logShopActivity } from './useShopActivityLogs';

export interface InterShopTransfer {
  id: string;
  from_shop_id: string;
  to_shop_id: string;
  product_id: string;
  quantity: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  completed_at: string | null;
  notes: string | null;
  delivered_by?: string | null;
  created_by: string;
  from_shop?: {
    name: string;
  };
  to_shop?: {
    name: string;
  };
  product?: {
    name: string;
    image_url: string | null;
    price: number;
  };
}

/**
 * Récupérer les transferts de stock entre boutiques
 */
export const useInterShopTransfers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inter-shop-transfers', user?.id],
    queryFn: async (): Promise<InterShopTransfer[]> => {
      if (!user?.id) return [];

      // Récupérer les boutiques de l'utilisateur
      const { data: userShops } = await supabase
        .from('physical_shops')
        .select('id')
        .eq('owner_id', user.id);

      if (!userShops || userShops.length === 0) return [];

      const userShopIds = userShops.map(s => s.id);

      const { data, error } = await supabase
        .from('shop_stock_transfers')
        .select(`
          *,
          from_shop:physical_shops!from_shop_id(name),
          to_shop:physical_shops!to_shop_id(name),
          product:physical_shop_products(name, image_url, price)
        `)
        .or(`from_shop_id.in.(${userShopIds.join(',')}),to_shop_id.in.(${userShopIds.join(',')})`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(transfer => ({
        ...transfer,
        from_shop: transfer.from_shop,
        to_shop: transfer.to_shop,
        product: transfer.product,
      })) as InterShopTransfer[];
    },
    enabled: !!user?.id,
  });
};

/**
 * Créer un nouveau transfert entre boutiques
 */
export const useCreateInterShopTransfer = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      fromShopId,
      toShopId,
      productId,
      quantity,
      notes,
      livreur,
    }: {
      fromShopId: string;
      toShopId: string;
      productId: string;
      quantity: number;
      notes?: string;
      livreur?: string;
    }) => {
      if (!user?.id) throw new Error('Non authentifié');

      // Vérifier le stock disponible
      const { data: product, error: productError } = await supabase
        .from('physical_shop_products')
        .select('stock_quantity, name')
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      if (!product) throw new Error('Produit non trouvé');
      if ((product.stock_quantity || 0) < quantity) {
        throw new Error(`Stock insuffisant. Disponible: ${product.stock_quantity || 0}`);
      }

      const { data, error } = await supabase
        .from('shop_stock_transfers')
        .insert({
          from_shop_id: fromShopId,
          to_shop_id: toShopId,
          product_id: productId,
          quantity,
          notes,
          delivered_by: livreur,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await logShopActivity({
        shopId: fromShopId,
        actionType: 'TRANSFER',
        details: `Création d'un transfert de ${quantity} unités du produit "${product.name}"${livreur ? ` (Livreur: ${livreur})` : ''}`
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inter-shop-transfers'] });
      toast.success('Demande de transfert créée !');
    },
    onError: (error: any) => {
      console.error('Erreur création transfert:', error);
      toast.error(error.message || 'Erreur lors de la création du transfert');
    },
  });
};

/**
 * Compléter un transfert entre boutiques
 */
export const useCompleteInterShopTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transferId: string) => {
      const { data, error } = await supabase.rpc('complete_shop_transfer', {
        transfer_id: transferId
      });

      if (error) throw error;

      const { data: t } = await supabase.from('shop_stock_transfers').select('*, to_shop_id').eq('id', transferId).single();
      if (t) {
        await logShopActivity({
          shopId: t.to_shop_id,
          actionType: 'TRANSFER',
          details: `Réception de ${t.quantity} unités via le transfert #${transferId.substring(0,8)}`
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inter-shop-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['boutique-products'] });
      queryClient.invalidateQueries({ queryKey: ['user-shops'] });
      toast.success('Transfert complété avec succès !');
    },
    onError: (error: any) => {
      console.error('Erreur completion transfert:', error);
      toast.error('Erreur lors du transfert');
    },
  });
};

/**
 * Annuler un transfert entre boutiques
 */
export const useCancelInterShopTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transferId: string) => {
      const { data, error } = await supabase
        .from('shop_stock_transfers')
        .update({ status: 'cancelled' })
        .eq('id', transferId)
        .select()
        .single();

      if (error) throw error;
      
      await logShopActivity({
        shopId: (data as any).from_shop_id,
        actionType: 'TRANSFER',
        details: `Transfert sortant #${transferId.substring(0, 8)} annulé.`
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inter-shop-transfers'] });
      toast.success('Transfert annulé');
    },
    onError: (error: any) => {
      console.error('Erreur annulation transfert:', error);
      toast.error('Erreur lors de l\'annulation');
    },
  });
};

/**
 * Obtenir les produits disponibles pour transfert depuis une boutique
 */
export const useAvailableProductsForTransfer = (shopId: string | undefined) => {
  return useQuery({
    queryKey: ['available-products-transfer', shopId],
    queryFn: async () => {
      if (!shopId) return [];

      const { data, error } = await supabase
        .from('physical_shop_products')
        .select('*')
        .eq('shop_id', shopId)
        .gt('stock_quantity', 0)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });
};