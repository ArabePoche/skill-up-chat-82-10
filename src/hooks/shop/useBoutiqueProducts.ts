/**
 * Hooks pour gérer les produits de la boutique physique
 * Offline-first : cache IndexedDB + sync Supabase
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { boutiqueProductStore, type LocalBoutiqueProduct } from '@/local-storage/stores/BoutiqueStore';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

// Types
export interface BoutiqueProduct {
    id: string;
    shop_id: string;
    product_id?: string | null;
    name: string;
    description?: string | null;
    price: number;
    stock_quantity: number;
    marketplace_quantity: number;
    image_url?: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Liste les produits d'une boutique physique (offline-first)
 */
export const useBoutiqueProducts = (shopId?: string) => {
    const [cachedProducts, setCachedProducts] = useState<LocalBoutiqueProduct[]>([]);

    // Charger le cache au montage
    useEffect(() => {
        if (!shopId) return;
        boutiqueProductStore.getByShop(shopId).then(products => {
            setCachedProducts(products);
        }).catch(() => { });
    }, [shopId]);

    return useQuery({
        queryKey: ['boutique-products', shopId],
        queryFn: async () => {
            console.log('📦 [useBoutiqueProducts] Fetching products for shop:', shopId);
            const { data, error } = await supabase
                .from('physical_shop_products')
                .select('*')
                .eq('shop_id', shopId!)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('📦 [useBoutiqueProducts] Error:', error);
                throw error;
            }
            console.log('📦 [useBoutiqueProducts] Found', data?.length, 'products');

            // Mettre en cache IndexedDB
            const localProducts: LocalBoutiqueProduct[] = (data || []).map(p => ({
                id: p.id,
                shopId: p.shop_id,
                productId: p.product_id || undefined,
                name: p.name,
                description: p.description || undefined,
                price: p.price || 0,
                stockQuantity: p.stock_quantity || 0,
                marketplaceQuantity: p.marketplace_quantity || 0,
                imageUrl: p.image_url || undefined,
                updatedAt: Date.now(),
            }));
            await boutiqueProductStore.putMany(localProducts);

            return data as BoutiqueProduct[];
        },
        enabled: !!shopId,
        initialData: cachedProducts.length > 0
            ? cachedProducts.map(p => ({
                id: p.id,
                shop_id: p.shopId,
                product_id: p.productId || null,
                name: p.name,
                description: p.description || null,
                price: p.price,
                stock_quantity: p.stockQuantity,
                marketplace_quantity: p.marketplaceQuantity,
                image_url: p.imageUrl || null,
                created_at: '',
                updated_at: '',
            } as BoutiqueProduct))
            : undefined,
        staleTime: 1000 * 60 * 5,
    });
};

/**
 * Créer un produit dans la boutique physique
 */
export const useCreateBoutiqueProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (product: {
            shop_id: string;
            name: string;
            description?: string;
            price: number;
            stock_quantity: number;
            image_url?: string;
        }) => {
            const { data, error } = await supabase
                .from('physical_shop_products')
                .insert({
                    ...product,
                    marketplace_quantity: 0,
                })
                .select()
                .single();

            if (error) throw error;

            // Cache IndexedDB
            await boutiqueProductStore.put({
                id: data.id,
                shopId: data.shop_id,
                name: data.name,
                description: data.description || undefined,
                price: data.price || 0,
                stockQuantity: data.stock_quantity || 0,
                marketplaceQuantity: 0,
                imageUrl: data.image_url || undefined,
                updatedAt: Date.now(),
            });

            return data as BoutiqueProduct;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['boutique-products', variables.shop_id] });
            toast.success('Produit ajouté !');
        },
        onError: (error: any) => {
            console.error('Erreur ajout produit:', error);
            toast.error('Erreur lors de l\'ajout du produit');
        },
    });
};

/**
 * Mettre à jour un produit de la boutique physique
 */
export const useUpdateBoutiqueProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (product: {
            id: string;
            shop_id: string;
            name?: string;
            description?: string;
            price?: number;
            stock_quantity?: number;
            image_url?: string;
        }) => {
            const { id, shop_id, ...updates } = product;

            const { data, error } = await supabase
                .from('physical_shop_products')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            // Mettre à jour le cache
            const existing = await boutiqueProductStore.get(id);
            if (existing) {
                await boutiqueProductStore.put({
                    ...existing,
                    ...updates,
                    stockQuantity: updates.stock_quantity ?? existing.stockQuantity,
                    updatedAt: Date.now(),
                });
            }

            return data as BoutiqueProduct;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['boutique-products', variables.shop_id] });
            toast.success('Produit mis à jour !');
        },
        onError: (error: any) => {
            console.error('Erreur mise à jour produit:', error);
            toast.error('Erreur lors de la mise à jour');
        },
    });
};

/**
 * Supprimer un produit de la boutique physique
 */
export const useDeleteBoutiqueProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, shopId }: { id: string; shopId: string }) => {
            const { error } = await supabase
                .from('physical_shop_products')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Supprimer du cache
            await boutiqueProductStore.delete(id);

            return { id, shopId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['boutique-products', data.shopId] });
            toast.success('Produit supprimé');
        },
        onError: (error: any) => {
            console.error('Erreur suppression produit:', error);
            toast.error('Erreur lors de la suppression');
        },
    });
};

/**
 * Transférer des produits vers le marketplace
 * Met à jour marketplace_quantity et crée/met à jour une entrée dans products
 */
export const useTransferToMarketplace = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            boutiqueProductId,
            shopId,
            quantity,
            sellerId,
        }: {
            boutiqueProductId: string;
            shopId: string;
            quantity: number;
            sellerId: string;
        }) => {
            // 1. Récupérer le produit boutique
            const { data: boutiqueProduct, error: fetchError } = await supabase
                .from('physical_shop_products')
                .select('*')
                .eq('id', boutiqueProductId)
                .single();

            if (fetchError || !boutiqueProduct) throw fetchError || new Error('Produit introuvable');

            // Vérifier le stock disponible
            const availableStock = boutiqueProduct.stock_quantity - boutiqueProduct.marketplace_quantity;
            if (quantity > availableStock) {
                throw new Error(`Stock insuffisant. Disponible : ${availableStock}`);
            }

            // 2. Mettre à jour marketplace_quantity dans physical_shop_products
            const newMarketplaceQty = boutiqueProduct.marketplace_quantity + quantity;
            const { error: updateError } = await supabase
                .from('physical_shop_products')
                .update({
                    marketplace_quantity: newMarketplaceQty,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', boutiqueProductId);

            if (updateError) throw updateError;

            // 3. Créer ou mettre à jour le produit dans la table products (marketplace)
            if (boutiqueProduct.product_id) {
                // Produit existant : mettre à jour la quantité
                const { error: productError } = await supabase
                    .from('products')
                    .update({
                        stock_quantity: newMarketplaceQty,
                        is_active: newMarketplaceQty > 0,
                    })
                    .eq('id', boutiqueProduct.product_id);

                if (productError) throw productError;
            } else {
                // Nouveau produit marketplace
                const { data: newProduct, error: insertError } = await supabase
                    .from('products')
                    .insert({
                        title: boutiqueProduct.name,
                        description: boutiqueProduct.description,
                        price: boutiqueProduct.price,
                        image_url: boutiqueProduct.image_url,
                        seller_id: sellerId,
                        is_active: true,
                        stock_quantity: newMarketplaceQty,
                        product_type: 'physical',
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                // Lier le produit marketplace au produit boutique
                await supabase
                    .from('physical_shop_products')
                    .update({ product_id: newProduct.id })
                    .eq('id', boutiqueProductId);
            }

            // Mettre à jour le cache local
            const cached = await boutiqueProductStore.get(boutiqueProductId);
            if (cached) {
                await boutiqueProductStore.put({
                    ...cached,
                    marketplaceQuantity: newMarketplaceQty,
                    updatedAt: Date.now(),
                });
            }

            return { success: true, newMarketplaceQty };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['boutique-products', variables.shopId] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Produit transféré vers le marketplace !');
        },
        onError: (error: any) => {
            console.error('Erreur transfert:', error);
            toast.error(error.message || 'Erreur lors du transfert');
        },
    });
};
