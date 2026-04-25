/**
 * Hook pour récupérer les statistiques de ventes du jour
 */
import { useOfflineQuery } from '@/offline/hooks/useOfflineQuery';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay } from 'date-fns';

export interface TodaySalesStats {
  totalRevenue: number;
  totalProfit: number;
  totalSales: number;
  totalItems: number;
  averageTicket: number;
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }[];
  salesByHour: { hour: number; revenue: number; profit: number; count: number }[];
  paymentMethods: { method: string; total: number; count: number }[];
}

export const useTodaySalesStats = (shopId?: string) => {
  return useOfflineQuery({
    queryKey: ['today-sales-stats', shopId],
    queryFn: async (): Promise<TodaySalesStats> => {
      if (!shopId) throw new Error('Shop ID required');

      const today = new Date();
      const startDate = startOfDay(today).toISOString();
      const endDate = endOfDay(today).toISOString();

      // Récupérer les ventes du jour avec les infos produit
      const { data: sales, error } = await (supabase as any)
        .from('physical_shop_sales')
        .select(`
          id,
          quantity,
          unit_price,
          total_amount,
          payment_method,
          sold_at,
          cost_price,
          product_id,
          physical_shop_products!physical_shop_sales_product_id_fkey(name)
        `)
        .eq('shop_id', shopId)
        .gte('sold_at', startDate)
        .lte('sold_at', endDate)
        .order('sold_at', { ascending: false });

      if (error) throw error;

      const salesData = sales || [];

      // Calculer les stats globales
      let totalProfit = 0;
      
      const totalRevenue = salesData.reduce((sum: number, s: any) => {
        const amount = Number(s.total_amount);
        const cost = Number(s.cost_price || 0) * s.quantity;
        totalProfit += (amount - cost);
        return sum + amount;
      }, 0);

      const totalSales = salesData.length;
      const totalItems = salesData.reduce((sum: number, s: any) => sum + s.quantity, 0);
      const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

      // Top produits
      const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
      salesData.forEach((sale: any) => {
        const pid = sale.product_id;
        const name = sale.physical_shop_products?.name || 'Produit inconnu';
        const existing = productMap.get(pid) || { name, quantity: 0, revenue: 0 };
        productMap.set(pid, {
          name,
          quantity: existing.quantity + sale.quantity,
          revenue: existing.revenue + Number(sale.total_amount),
        });
      });
      const topProducts = Array.from(productMap.entries())
        .map(([productId, data]) => ({ productId, productName: data.name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Ventes par heure
      const hourMap = new Map<number, { revenue: number; profit: number; count: number }>();
      
      // Initialiser toutes les heures de 8h à 20h (optionnel, mais mieux pour le graph)
      for (let i = 8; i <= 20; i++) {
         hourMap.set(i, { revenue: 0, profit: 0, count: 0 });
      }

      salesData.forEach((sale: any) => {
        const hour = new Date(sale.sold_at).getHours();
        const existing = hourMap.get(hour) || { revenue: 0, profit: 0, count: 0 };
        const amount = Number(sale.total_amount);
        const cost = Number(sale.cost_price || 0) * sale.quantity;
        
        hourMap.set(hour, {
          revenue: existing.revenue + amount,
          profit: existing.profit + (amount - cost),
          count: existing.count + 1,
        });
      });
      
      const salesByHour = Array.from(hourMap.entries())
        .map(([hour, data]) => ({ hour, ...data }))
        .sort((a, b) => a.hour - b.hour)
        // Filtrer les heures hors plage seulement si elles sont vides
        .filter(h => h.revenue > 0 || (h.hour >= 8 && h.hour <= 20));

      // Par méthode de paiement
      const methodMap = new Map<string, { total: number; count: number }>();
      salesData.forEach((sale: any) => {
        const rawMethod = sale.payment_method || 'cash';

        // Check if method is a JSON split payment like '{"cash": 2000, "mobile": 3000}'
        if (rawMethod.startsWith('{')) {
          try {
            const splits = JSON.parse(rawMethod);
            const methods = Object.keys(splits);
            
            methods.forEach(method => {
              const amount = Number(splits[method]);
              const existing = methodMap.get(method) || { total: 0, count: 0 };
              methodMap.set(method, {
                total: existing.total + amount,
                count: existing.count + (1 / methods.length), // counts as a partial sale for average purposes
              });
            });
            return;
          } catch(e) {
            // fallback if it was just a string starting with '{'
          }
        }

        const method = rawMethod;
        const existing = methodMap.get(method) || { total: 0, count: 0 };
        methodMap.set(method, {
          total: existing.total + Number(sale.total_amount),
          count: existing.count + 1,
        });
      });
      const paymentMethods = Array.from(methodMap.entries())
        .map(([method, data]) => ({ method, ...data }))
        .sort((a, b) => b.total - a.total);

      return {
        totalRevenue,
        totalProfit,
        totalSales,
        totalItems,
        averageTicket,
        topProducts,
        salesByHour,
        paymentMethods,
      };
    },
    enabled: !!shopId,
    refetchInterval: 30000, // Rafraîchir toutes les 30s
  });
};
