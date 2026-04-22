/**
 * Hook pour gérer plusieurs boutiques d'un utilisateur
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface MultiShopStats {
  totalShops: number;
  totalProducts: number;
  totalStockValue: number;
  totalStockUnits: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}

export interface ShopWithProducts {
  id: string;
  name: string;
  address?: string;
  owner_id?: string;
  products_count: number;
  total_stock_value: number;
  total_stock_units: number;
  low_stock_products: number;
  out_of_stock_products: number;
  created_at: string;
}

/**
 * Récupérer toutes les boutiques de l'utilisateur avec leurs stats
 */
export const useUserShops = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-shops', user?.id],
    queryFn: async (): Promise<ShopWithProducts[]> => {
      if (!user?.id) return [];

      // On récupère les IDs des shops où l'utilisateur est agent
      const { data: agentShops } = await supabase
        .from('shop_agents' as any)
        .select('shop_id')
        .eq('user_id', user.id);

      const shopIds = ((agentShops as any) || []).map((as: any) => as.shop_id);

      let query = supabase
        .from('physical_shops')
        .select(`
          *,
          products:physical_shop_products(
            stock_quantity,
            marketplace_quantity,
            price
          )
        `);

      if (shopIds.length > 0) {
        query = query.or(`owner_id.eq.${user.id},id.in.(${shopIds.join(',')})`);
      } else {
        query = query.eq('owner_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(shop => {
        const products = shop.products || [];

        // Calculer le stock total en utilisant les fonctions SQL qui gèrent les lots
        const totalStockUnits = products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);

        const totalStockValue = products.reduce((sum, p) => sum + ((p.stock_quantity || 0) * p.cost_price), 0);

        const lowStockCount = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 5).length;

        const outOfStockCount = products.filter(p => p.stock_quantity <= 0).length;

        return {
          id: shop.id,
          name: shop.name,
          address: shop.address,
          owner_id: shop.owner_id,
          products_count: products.length,
          total_stock_value: totalStockValue,
          total_stock_units: totalStockUnits,
          low_stock_products: lowStockCount,
          out_of_stock_products: outOfStockCount,
          created_at: shop.created_at,
        };
      });
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Statistiques globales multi-boutiques
 */
export const useMultiShopStats = () => {
  const { data: shops } = useUserShops();

  return useQuery({
    queryKey: ['multi-shop-stats', shops],
    queryFn: (): MultiShopStats => {
      if (!shops || shops.length === 0) {
        return {
          totalShops: 0,
          totalProducts: 0,
          totalStockValue: 0,
          totalStockUnits: 0,
          lowStockProducts: 0,
          outOfStockProducts: 0,
        };
      }

      return {
        totalShops: shops.length,
        totalProducts: shops.reduce((sum, shop) => sum + shop.products_count, 0),
        totalStockValue: shops.reduce((sum, shop) => sum + shop.total_stock_value, 0),
        totalStockUnits: shops.reduce((sum, shop) => sum + shop.total_stock_units, 0),
        lowStockProducts: shops.reduce((sum, shop) => sum + shop.low_stock_products, 0),
        outOfStockProducts: shops.reduce((sum, shop) => sum + shop.out_of_stock_products, 0),
      };
    },
    enabled: !!shops,
  });
};

/**
 * Créer une nouvelle boutique
 */
export const useCreateNewShop = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, address }: { name: string; address?: string }) => {
      if (!user?.id) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('physical_shops')
        .insert({
          owner_id: user.id,
          name,
          address,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-shops'] });
      toast.success('Boutique créée avec succès !');
    },
    onError: (error: any) => {
      console.error('Erreur création boutique:', error);
      toast.error('Erreur lors de la création de la boutique');
    },
  });
};

/**
 * Mettre à jour une boutique
 */
export const useUpdateShop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shopId, name, address }: { shopId: string; name: string; address?: string }) => {
      const { data, error } = await supabase
        .from('physical_shops')
        .update({ name, address })
        .eq('id', shopId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-shops'] });
      toast.success('Boutique mise à jour !');
    },
    onError: (error: any) => {
      console.error('Erreur mise à jour boutique:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });
};

/**
 * Supprimer une boutique
 */
export const useDeleteShop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shopId: string) => {
      const { error } = await supabase
        .from('physical_shops')
        .delete()
        .eq('id', shopId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-shops'] });
      toast.success('Boutique supprimée');
    },
    onError: (error: any) => {
      console.error('Erreur suppression boutique:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
};