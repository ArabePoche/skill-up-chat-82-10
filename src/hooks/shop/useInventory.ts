/**
 * Hook pour gérer l'inventaire et les mouvements de stock
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfflineQuery } from '@/offline/hooks/useOfflineQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type MovementType = 'in' | 'out' | 'adjustment' | 'sale' | 'return' | 'transfer_out' | 'transfer_in';

export interface InventoryMovement {
    id: string;
    shop_id: string;
    product_id: string;
    movement_type: MovementType;
    quantity: number;
    previous_stock: number;
    new_stock: number;
    reason: string | null;
    reference_id: string | null;
    created_by: string | null;
    created_at: string;
    // Jointures
    product?: {
        name: string;
        image_url: string | null;
    };
}

export interface InventoryStats {
    totalProducts: number;
    totalStockValue: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    recentMovements: number;
}

/**
 * Récupère l'historique des mouvements d'inventaire
 */
export const useInventoryMovements = (shopId: string | undefined, limit = 50) => {
    return useOfflineQuery<any[]>({
        queryKey: ['inventory-movements', shopId, limit],
        queryFn: async () => {
            if (!shopId) return [];

            const { data, error } = await supabase
                .from('inventory_movements')
                .select(`
                    *,
                    product:physical_shop_products(name, image_url)
                `)
                .eq('shop_id', shopId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return (data || []) as InventoryMovement[];
        },
        enabled: !!shopId,
    });
};

/**
 * Statistiques d'inventaire
 */
export const useInventoryStats = (shopId: string | undefined) => {
    return useOfflineQuery<any>({
        queryKey: ['inventory-stats', shopId],
        queryFn: async (): Promise<InventoryStats> => {
            if (!shopId) {
                return {
                    totalProducts: 0,
                    totalStockValue: 0,
                    lowStockProducts: 0,
                    outOfStockProducts: 0,
                    recentMovements: 0,
                };
            }

            // Récupérer les produits
            const { data: products, error: productsError } = await supabase
                .from('physical_shop_products')
                .select('stock_quantity, price')
                .eq('shop_id', shopId);

            if (productsError) throw productsError;

            // Mouvements des dernières 24h
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const { count: recentMovements } = await supabase
                .from('inventory_movements')
                .select('id', { count: 'exact', head: true })
                .eq('shop_id', shopId)
                .gte('created_at', yesterday.toISOString());

            const stats: InventoryStats = {
                totalProducts: products?.length || 0,
                totalStockValue: products?.reduce((sum, p) => sum + (p.stock_quantity || 0) * (p.price || 0), 0) || 0,
                lowStockProducts: products?.filter(p => (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= 5).length || 0,
                outOfStockProducts: products?.filter(p => (p.stock_quantity || 0) === 0).length || 0,
                recentMovements: recentMovements || 0,
            };

            return stats;
        },
        enabled: !!shopId,
        staleTime: 30000,
    });
};

/**
 * Ajouter un mouvement d'inventaire (entrée/sortie/ajustement)
 */
export const useAddInventoryMovement = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({
            shopId,
            productId,
            movementType,
            quantity,
            reason,
        }: {
            shopId: string;
            productId: string;
            movementType: MovementType;
            quantity: number;
            reason?: string;
        }) => {
            // Récupérer le stock actuel
            const { data: product, error: fetchError } = await supabase
                .from('physical_shop_products')
                .select('stock_quantity')
                .eq('id', productId)
                .single();

            if (fetchError) throw fetchError;

            const previousStock = product.stock_quantity || 0;
            let newStock = previousStock;

            // Calculer le nouveau stock selon le type
            if (movementType === 'in' || movementType === 'return' || movementType === 'transfer_in') {
                newStock = previousStock + quantity;
            } else if (movementType === 'out' || movementType === 'sale' || movementType === 'transfer_out') {
                newStock = Math.max(0, previousStock - quantity);
            } else if (movementType === 'adjustment') {
                newStock = quantity; // L'ajustement définit directement le stock
            }

            // Mettre à jour le stock du produit
            const { error: updateError } = await supabase
                .from('physical_shop_products')
                .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
                .eq('id', productId);

            if (updateError) throw updateError;

            // Enregistrer le mouvement
            const { data: movement, error: insertError } = await supabase
                .from('inventory_movements')
                .insert({
                    shop_id: shopId,
                    product_id: productId,
                    movement_type: movementType,
                    quantity: movementType === 'adjustment' ? Math.abs(newStock - previousStock) : quantity,
                    previous_stock: previousStock,
                    new_stock: newStock,
                    reason,
                    created_by: user?.id,
                })
                .select()
                .single();

            if (insertError) throw insertError;

            return movement;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['inventory-movements', variables.shopId] });
            queryClient.invalidateQueries({ queryKey: ['inventory-stats', variables.shopId] });
            queryClient.invalidateQueries({ queryKey: ['boutique-products', variables.shopId] });
            toast.success('Mouvement enregistré');
        },
        onError: (error: any) => {
            console.error('Erreur mouvement inventaire:', error);
            toast.error('Erreur lors de l\'enregistrement');
        },
    });
};

/**
 * Obtenir le libellé d'un type de mouvement
 */
export const getMovementTypeLabel = (type: MovementType): string => {
    const labels: Record<MovementType, string> = {
        in: 'Entrée',
        out: 'Sortie',
        adjustment: 'Ajustement',
        sale: 'Vente',
        return: 'Retour client',
        transfer_out: 'Transfert sortant',
        transfer_in: 'Transfert entrant',
    };
    return labels[type] || type;
};

/**
 * Couleur associée au type de mouvement
 */
export const getMovementTypeColor = (type: MovementType): string => {
    const colors: Record<MovementType, string> = {
        in: 'text-emerald-600 bg-emerald-50',
        out: 'text-red-600 bg-red-50',
        adjustment: 'text-blue-600 bg-blue-50',
        sale: 'text-orange-600 bg-orange-50',
        return: 'text-purple-600 bg-purple-50',
        transfer_out: 'text-amber-600 bg-amber-50',
        transfer_in: 'text-teal-600 bg-teal-50',
    };
    return colors[type] || 'text-gray-600 bg-gray-50';
};
