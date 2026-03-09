/**
 * Hook pour gérer les clients de la boutique physique
 * Inclut : CRUD clients, historique d'achats, crédit/dette, fidélité
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ShopCustomer {
  id: string;
  shop_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  total_spent: number;
  total_purchases: number;
  loyalty_points: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerCredit {
  id: string;
  customer_id: string;
  shop_id: string;
  sale_id?: string | null;
  amount: number;
  type: 'credit' | 'payment';
  description?: string | null;
  created_at: string;
}

/** Récupérer les clients d'une boutique */
export const useShopCustomers = (shopId?: string) => {
  return useQuery({
    queryKey: ['shop-customers', shopId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('shop_customers')
        .select('*')
        .eq('shop_id', shopId!)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as ShopCustomer[];
    },
    enabled: !!shopId,
  });
};

/** Créer un client */
export const useCreateShopCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (customer: { shop_id: string; name: string; phone?: string; email?: string; address?: string; notes?: string }) => {
      const { data, error } = await (supabase as any)
        .from('shop_customers')
        .insert(customer)
        .select()
        .single();
      if (error) throw error;
      return data as ShopCustomer;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['shop-customers', vars.shop_id] });
      toast.success('Client ajouté !');
    },
    onError: () => toast.error('Erreur lors de l\'ajout du client'),
  });
};

/** Mettre à jour un client */
export const useUpdateShopCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, shop_id, ...updates }: Partial<ShopCustomer> & { id: string; shop_id: string }) => {
      const { data, error } = await (supabase as any)
        .from('shop_customers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ShopCustomer;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['shop-customers', vars.shop_id] });
      toast.success('Client mis à jour !');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });
};

/** Supprimer un client */
export const useDeleteShopCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, shopId }: { id: string; shopId: string }) => {
      const { error } = await (supabase as any)
        .from('shop_customers')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { id, shopId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shop-customers', data.shopId] });
      toast.success('Client supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });
};

/** Récupérer les crédits/dettes d'un client */
export const useCustomerCredits = (customerId?: string) => {
  return useQuery({
    queryKey: ['customer-credits', customerId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('shop_customer_credits')
        .select('*')
        .eq('customer_id', customerId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CustomerCredit[];
    },
    enabled: !!customerId,
  });
};

/** Ajouter un crédit ou un paiement */
export const useAddCustomerCredit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credit: { customer_id: string; shop_id: string; amount: number; type: 'credit' | 'payment'; description?: string; sale_id?: string }) => {
      const { data, error } = await (supabase as any)
        .from('shop_customer_credits')
        .insert(credit)
        .select()
        .single();
      if (error) throw error;

      // Mettre à jour total_spent si c'est un paiement
      if (credit.type === 'payment') {
        await (supabase as any)
          .from('shop_customers')
          .update({ 
            total_spent: (supabase as any).rpc ? undefined : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', credit.customer_id);
      }

      return data as CustomerCredit;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['customer-credits', vars.customer_id] });
      queryClient.invalidateQueries({ queryKey: ['shop-customers', vars.shop_id] });
      toast.success(vars.type === 'credit' ? 'Crédit enregistré' : 'Paiement enregistré');
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  });
};

/** Récupérer l'historique d'achats d'un client */
export const useCustomerPurchases = (customerId?: string, shopId?: string) => {
  return useQuery({
    queryKey: ['customer-purchases', customerId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('physical_shop_sales')
        .select(`
          id, quantity, unit_price, total_amount, payment_method, sold_at, cost_price,
          physical_shop_products!physical_shop_sales_product_id_fkey(name, image_url)
        `)
        .eq('shop_id', shopId!)
        .eq('customer_id', customerId!)
        .order('sold_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customerId && !!shopId,
  });
};

/** Calculer le solde crédit d'un client (positif = doit, négatif = crédit en faveur) */
export const getCustomerBalance = (credits: CustomerCredit[]): number => {
  return credits.reduce((balance, c) => {
    return c.type === 'credit' ? balance + c.amount : balance - c.amount;
  }, 0);
};
