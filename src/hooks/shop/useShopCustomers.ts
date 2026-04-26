/**
 * Hook pour gérer les clients de la boutique physique
 * Inclut : CRUD clients, historique d'achats, crédit/dette, fidélité
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfflineQuery } from '@/offline/hooks/useOfflineQuery';
import { useOfflineMutation } from '@/offline/hooks/useOfflineMutation';
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
  return useOfflineQuery<ShopCustomer[]>({
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

/** Créer un client (offline-first) */
export const useCreateShopCustomer = () => {
  const queryClient = useQueryClient();
  return useOfflineMutation<any, { shop_id: string; name: string; phone?: string; email?: string; address?: string; notes?: string }>({
    mutationType: 'generic',
    invalidateKeys: [['shop-customers']],
    offlinePayloadTransformer: (customer) => ({
      table: 'shop_customers',
      operation: 'insert',
      data: customer,
    }),
    optimisticUpdate: (customer) => {
      const tempId = `optimistic-${Date.now()}`;
      const optimistic: ShopCustomer = {
        id: tempId,
        shop_id: customer.shop_id,
        name: customer.name,
        phone: customer.phone || null,
        email: customer.email || null,
        address: customer.address || null,
        notes: customer.notes || null,
        total_spent: 0,
        total_purchases: 0,
        loyalty_points: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const prev = queryClient.getQueryData<ShopCustomer[]>(['shop-customers', customer.shop_id]) || [];
      queryClient.setQueryData(['shop-customers', customer.shop_id], [...prev, optimistic]);
      return optimistic;
    },
    mutationFn: async (customer) => {
      const { data, error } = await (supabase as any)
        .from('shop_customers')
        .insert(customer)
        .select()
        .single();
      if (error) throw error;
      return data as ShopCustomer;
    },
    onSuccess: () => {
      toast.success('Client ajouté !');
    },
    onError: () => toast.error('Erreur lors de l\'ajout du client'),
  });
};

/** Mettre à jour un client (offline-first) */
export const useUpdateShopCustomer = () => {
  const queryClient = useQueryClient();
  return useOfflineMutation<any, Partial<ShopCustomer> & { id: string; shop_id: string }>({
    mutationType: 'generic',
    invalidateKeys: [['shop-customers']],
    offlinePayloadTransformer: ({ id, shop_id: _shop_id, ...updates }) => ({
      table: 'shop_customers',
      operation: 'update',
      id,
      data: { ...updates, updated_at: new Date().toISOString() },
    }),
    optimisticUpdate: ({ id, shop_id, ...updates }) => {
      const prev = queryClient.getQueryData<ShopCustomer[]>(['shop-customers', shop_id]) || [];
      const next = prev.map(c => c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c);
      queryClient.setQueryData(['shop-customers', shop_id], next);
      return next.find(c => c.id === id);
    },
    mutationFn: async ({ id, shop_id, ...updates }) => {
      const { data, error } = await (supabase as any)
        .from('shop_customers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ShopCustomer;
    },
    onSuccess: () => {
      toast.success('Client mis à jour !');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });
};

/** Supprimer un client (offline-first) */
export const useDeleteShopCustomer = () => {
  const queryClient = useQueryClient();
  return useOfflineMutation<any, { id: string; shopId: string }>({
    mutationType: 'generic',
    invalidateKeys: [['shop-customers']],
    offlinePayloadTransformer: ({ id }) => ({
      table: 'shop_customers',
      operation: 'delete',
      id,
    }),
    optimisticUpdate: ({ id, shopId }) => {
      const prev = queryClient.getQueryData<ShopCustomer[]>(['shop-customers', shopId]) || [];
      queryClient.setQueryData(['shop-customers', shopId], prev.filter(c => c.id !== id));
      return { id, shopId };
    },
    mutationFn: async ({ id, shopId }) => {
      const { error } = await (supabase as any)
        .from('shop_customers')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { id, shopId };
    },
    onSuccess: () => {
      toast.success('Client supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });
};

/** Récupérer les crédits/dettes d'un client */
export const useCustomerCredits = (customerId?: string) => {
  return useOfflineQuery<CustomerCredit[]>({
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

/** Ajouter un crédit ou un paiement (offline-first) */
export const useAddCustomerCredit = () => {
  const queryClient = useQueryClient();
  return useOfflineMutation<any, { customer_id: string; shop_id: string; amount: number; type: 'credit' | 'payment'; description?: string; sale_id?: string }>({
    mutationType: 'generic',
    invalidateKeys: [['customer-credits'], ['shop-customers']],
    offlinePayloadTransformer: (credit) => ({
      table: 'shop_customer_credits',
      operation: 'insert',
      data: credit,
    }),
    optimisticUpdate: (credit) => {
      const optimistic: CustomerCredit = {
        id: `optimistic-${Date.now()}`,
        customer_id: credit.customer_id,
        shop_id: credit.shop_id,
        sale_id: credit.sale_id || null,
        amount: credit.amount,
        type: credit.type,
        description: credit.description || null,
        created_at: new Date().toISOString(),
      };
      const prev = queryClient.getQueryData<CustomerCredit[]>(['customer-credits', credit.customer_id]) || [];
      queryClient.setQueryData(['customer-credits', credit.customer_id], [optimistic, ...prev]);
      return optimistic;
    },
    mutationFn: async (credit) => {
      const { data, error } = await (supabase as any)
        .from('shop_customer_credits')
        .insert(credit)
        .select()
        .single();
      if (error) throw error;
      return data as CustomerCredit;
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.type === 'credit' ? 'Crédit enregistré' : 'Paiement enregistré');
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  });
};

/** Récupérer l'historique d'achats d'un client */
export const useCustomerPurchases = (customerId?: string, shopId?: string) => {
  return useOfflineQuery<any>({
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
