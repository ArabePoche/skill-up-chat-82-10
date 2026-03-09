/**
 * Hooks pour gérer les produits de la boutique physique
 * Offline-first : cache IndexedDB + sync Supabase
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { boutiqueProductStore, type LocalBoutiqueProduct } from '@/local-storage/stores/BoutiqueStore';
import { offlineStore } from '@/offline/utils/offlineStore';
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
    barcode?: string | null;
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

            // Mettre en cache IndexedDB (non bloquant)
            try {
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
                    barcode: p.barcode || undefined,
                    updatedAt: Date.now(),
                }));
                await boutiqueProductStore.putMany(localProducts);
            } catch (cacheError) {
                console.warn('📦 [useBoutiqueProducts] Cache IndexedDB failed (non-blocking):', cacheError);
            }

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

            // 1. Mise à jour locale optimiste
            const existing = await boutiqueProductStore.get(id);
            if (!existing) throw new Error('Produit introuvable localement');

            const updatedLocal = {
                ...existing,
                ...updates,
                stockQuantity: updates.stock_quantity ?? existing.stockQuantity,
                updatedAt: Date.now(),
            };
            await boutiqueProductStore.put(updatedLocal);

            // 2. Gestion Offline
            if (!navigator.onLine) {
                console.log('📵 App status: offline. Queueing update mutation.');
                await offlineStore.addPendingMutation({
                    type: 'update_boutique_product',
                    payload: product
                });
                return updatedLocal as any;
            }

            // 3. Mode Online : Sync avec Supabase
            console.log('🌐 App status: online. Syncing update with Supabase.');

            // Mise à jour de la table boutique
            const { data, error } = await supabase
                .from('physical_shop_products')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                // Si erreur réseau, on queue la mutation
                if (error.message.includes('fetch') || error.message.includes('network')) {
                    await offlineStore.addPendingMutation({
                        type: 'update_boutique_product',
                        payload: product
                    });
                    return updatedLocal as any;
                }
                throw error;
            }

            // Propagation vers le Marketplace s'il y a un product_id lié
            if (data.product_id) {
                const productUpdates: any = {};
                if (updates.name !== undefined) productUpdates.title = updates.name;
                if (updates.description !== undefined) productUpdates.description = updates.description;
                if (updates.price !== undefined) productUpdates.price = updates.price;
                if (updates.image_url !== undefined) productUpdates.image_url = updates.image_url;

                if (Object.keys(productUpdates).length > 0) {
                    const { error: marketplaceError } = await supabase
                        .from('products')
                        .update(productUpdates)
                        .eq('id', data.product_id);

                    if (marketplaceError) {
                        console.error('⚠️ Failed to sync update to marketplace:', marketplaceError);
                    }
                }
            }

            return data as BoutiqueProduct;
        },
        onMutate: async (updatedProduct) => {
            // Annuler les refetchs en cours pour ne pas écraser notre mise à jour optimiste
            await queryClient.cancelQueries({ queryKey: ['boutique-products', updatedProduct.shop_id] });

            // Sauvegarder l'état précédent pour le rollback
            const previousProducts = queryClient.getQueryData<BoutiqueProduct[]>(['boutique-products', updatedProduct.shop_id]);

            // Mise à jour optimiste du cache
            if (previousProducts) {
                queryClient.setQueryData<BoutiqueProduct[]>(
                    ['boutique-products', updatedProduct.shop_id],
                    previousProducts.map(p => p.id === updatedProduct.id ? { ...p, ...updatedProduct, stock_quantity: updatedProduct.stock_quantity ?? p.stock_quantity } as BoutiqueProduct : p)
                );
            }

            return { previousProducts };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['boutique-products', variables.shop_id] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Produit mis à jour !');
        },
        onError: (error: any, variables, context) => {
            console.error('Erreur mise à jour produit:', error);
            // Rollback en cas d'erreur
            if (context?.previousProducts) {
                queryClient.setQueryData(['boutique-products', variables.shop_id], context.previousProducts);
            }
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
            // 1. Suppression locale immédiate du cache
            await boutiqueProductStore.delete(id);

            // 2. Gestion Offline
            if (!navigator.onLine) {
                console.log('📵 App status: offline. Queueing delete mutation.');
                await offlineStore.addPendingMutation({
                    type: 'delete_boutique_product',
                    payload: { id, shopId }
                });
                return { id, shopId };
            }

            // 3. Mode Online : Sync avec Supabase
            const { error } = await supabase
                .from('physical_shop_products')
                .delete()
                .eq('id', id);

            if (error) {
                // Si erreur réseau (et non erreur SQL), on peut quand même tenter de queue
                if (error.message.includes('fetch') || error.message.includes('network')) {
                    await offlineStore.addPendingMutation({
                        type: 'delete_boutique_product',
                        payload: { id, shopId }
                    });
                    return { id, shopId };
                }
                throw error;
            }

            return { id, shopId };
        },
        onMutate: async ({ id, shopId }) => {
            await queryClient.cancelQueries({ queryKey: ['boutique-products', shopId] });
            const previousProducts = queryClient.getQueryData<BoutiqueProduct[]>(['boutique-products', shopId]);

            if (previousProducts) {
                queryClient.setQueryData<BoutiqueProduct[]>(
                    ['boutique-products', shopId],
                    previousProducts.filter(p => p.id !== id)
                );
            }

            return { previousProducts };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['boutique-products', data.shopId] });
            toast.success('Produit supprimé');
        },
        onError: (error: any, variables, context) => {
            console.error('Erreur suppression produit:', error);
            if (context?.previousProducts) {
                queryClient.setQueryData(['boutique-products', variables.shopId], context.previousProducts);
            }
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
            // 1. Mises à jour locales immédiates (Cache IndexedDB)
            const cached = await boutiqueProductStore.get(boutiqueProductId);
            if (!cached) throw new Error('Produit introuvable localement');

            const newMarketplaceQty = cached.marketplaceQuantity + quantity;
            const availableStock = cached.stockQuantity - cached.marketplaceQuantity;

            if (quantity > availableStock) {
                throw new Error(`Stock insuffisant. Disponible : ${availableStock}`);
            }

            // Mise à jour optimiste du store local
            await boutiqueProductStore.put({
                ...cached,
                marketplaceQuantity: newMarketplaceQty,
                updatedAt: Date.now(),
            });

            // 2. Gestion Offline / Online
            if (!navigator.onLine) {
                console.log('📵 App status: offline. Queueing transfer mutation.');
                await offlineStore.addPendingMutation({
                    type: 'transfer',
                    payload: {
                        boutiqueProductId,
                        shopId,
                        quantity,
                        sellerId
                    }
                });
                return { success: true, offline: true, newMarketplaceQty };
            }

            // 3. Mode Online : Sync directe avec Supabase
            console.log('🌐 App status: online. Syncing transfer with Supabase.');

            // Récupérer les données réelles (plus sûr avant de sync)
            const { data: boutiqueProduct, error: fetchError } = await supabase
                .from('physical_shop_products')
                .select('*')
                .eq('id', boutiqueProductId)
                .single();

            if (fetchError || !boutiqueProduct) throw fetchError || new Error('Produit introuvable sur le serveur');

            // 2. Mettre à jour marketplace_quantity dans physical_shop_products
            const serverMarketplaceQty = boutiqueProduct.marketplace_quantity + quantity;
            const { error: updateError } = await supabase
                .from('physical_shop_products')
                .update({
                    marketplace_quantity: serverMarketplaceQty,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', boutiqueProductId);

            if (updateError) throw updateError;

            // 3. Créer ou mettre à jour le produit dans la table products (marketplace)
            if (boutiqueProduct.product_id) {
                const { error: productError } = await supabase
                    .from('products')
                    .update({
                        stock: serverMarketplaceQty,
                        quantity: serverMarketplaceQty,
                        is_active: true, // Garder actif même si stock = 0
                    })
                    .eq('id', boutiqueProduct.product_id);

                if (productError) throw productError;
            } else {
                const { data: newProduct, error: insertError } = await supabase
                    .from('products')
                    .insert({
                        title: boutiqueProduct.name,
                        description: boutiqueProduct.description,
                        price: boutiqueProduct.price,
                        image_url: boutiqueProduct.image_url,
                        seller_id: sellerId,
                        is_active: true,
                        stock: serverMarketplaceQty,
                        quantity: serverMarketplaceQty,
                        product_type: 'physical',
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                await supabase
                    .from('physical_shop_products')
                    .update({ product_id: newProduct.id })
                    .eq('id', boutiqueProductId);
            }

            // Vérifier le stock actuel du produit marketplace pour déclencher les notifs de restock
            // On vérifie le stock RÉEL dans la table products (ce que le client voit)
            const pid = boutiqueProduct.product_id || (await supabase.from('physical_shop_products').select('product_id').eq('id', boutiqueProductId).single()).data?.product_id;
            if (pid) {
                // Récupérer l'ancien stock du produit marketplace
                const { data: marketplaceProduct } = await supabase
                    .from('products')
                    .select('stock')
                    .eq('id', pid)
                    .single();

                const oldStock = marketplaceProduct?.stock ?? 0;
                console.log(`📦 Stock avant mise à jour: ${oldStock}, nouveau stock marketplace: ${serverMarketplaceQty}`);

                // Si le produit était en rupture (stock <= 0) et qu'il est maintenant disponible
                if (oldStock <= 0 && serverMarketplaceQty > 0) {
                    console.log(`🔔 Déclenchement des notifications de réapprovisionnement pour le produit ${pid}`);
                    supabase.functions.invoke('notify-restock', {
                        body: { productId: pid }
                    })
                        .then(({ data, error }) => {
                            if (error) console.error('❌ Erreur API notifications restock:', error);
                            else console.log('✅ Réponse notifications restock:', data);
                        })
                        .catch(err => console.error('❌ Erreur lors du déclenchement des notifications:', err));
                }
            }

            return { success: true, newMarketplaceQty: serverMarketplaceQty };
        },
        onMutate: async ({ boutiqueProductId, shopId, quantity }) => {
            await queryClient.cancelQueries({ queryKey: ['boutique-products', shopId] });
            const previousProducts = queryClient.getQueryData<BoutiqueProduct[]>(['boutique-products', shopId]);

            if (previousProducts) {
                queryClient.setQueryData<BoutiqueProduct[]>(
                    ['boutique-products', shopId],
                    previousProducts.map(p => p.id === boutiqueProductId ? { ...p, marketplace_quantity: p.marketplace_quantity + quantity } : p)
                );
            }

            return { previousProducts };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['boutique-products', variables.shopId] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Produit transféré vers le marketplace !');
        },
        onError: (error: any, variables, context) => {
            console.error('Erreur transfert:', error);
            if (context?.previousProducts) {
                queryClient.setQueryData(['boutique-products', variables.shopId], context.previousProducts);
            }
            toast.error(error.message || 'Erreur lors du transfert');
        },
    });
};

/**
 * Retourner du stock du marketplace vers la boutique physique
 */
export const useReturnFromMarketplace = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            boutiqueProductId,
            shopId,
            quantity,
        }: {
            boutiqueProductId: string;
            shopId: string;
            quantity: number;
        }) => {
            // 1. Mises à jour locales immédiates (Cache IndexedDB)
            const cached = await boutiqueProductStore.get(boutiqueProductId);
            if (!cached) throw new Error('Produit introuvable localement');

            const newMarketplaceQty = Math.max(0, cached.marketplaceQuantity - quantity);

            // Mise à jour optimiste du store local
            await boutiqueProductStore.put({
                ...cached,
                marketplaceQuantity: newMarketplaceQty,
                updatedAt: Date.now(),
            });

            // 2. Gestion Offline / Online
            if (!navigator.onLine) {
                console.log('📵 App status: offline. Queueing return mutation.');
                await offlineStore.addPendingMutation({
                    type: 'return',
                    payload: {
                        boutiqueProductId,
                        shopId,
                        quantity
                    }
                });
                return { success: true, offline: true, newMarketplaceQty };
            }

            // 3. Mode Online : Sync directe avec Supabase
            console.log('🌐 App status: online. Syncing return with Supabase.');

            const { data: boutiqueProduct, error: fetchError } = await supabase
                .from('physical_shop_products')
                .select('*')
                .eq('id', boutiqueProductId)
                .single();

            if (fetchError || !boutiqueProduct) throw fetchError || new Error('Produit introuvable sur le serveur');

            const serverMarketplaceQty = Math.max(0, boutiqueProduct.marketplace_quantity - quantity);

            // Mettre à jour physical_shop_products
            const { error: updateError } = await supabase
                .from('physical_shop_products')
                .update({
                    marketplace_quantity: serverMarketplaceQty,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', boutiqueProductId);

            if (updateError) throw updateError;

            // Mettre à jour le produit marketplace
            if (boutiqueProduct.product_id) {
                const { error: productError } = await supabase
                    .from('products')
                    .update({
                        stock: serverMarketplaceQty,
                        quantity: serverMarketplaceQty,
                        is_active: true, // Garder actif même si stock = 0
                    })
                    .eq('id', boutiqueProduct.product_id);

                if (productError) throw productError;
            }

            return { success: true, newMarketplaceQty: serverMarketplaceQty };
        },
        onMutate: async ({ boutiqueProductId, shopId, quantity }) => {
            await queryClient.cancelQueries({ queryKey: ['boutique-products', shopId] });
            const previousProducts = queryClient.getQueryData<BoutiqueProduct[]>(['boutique-products', shopId]);

            if (previousProducts) {
                queryClient.setQueryData<BoutiqueProduct[]>(
                    ['boutique-products', shopId],
                    previousProducts.map(p => p.id === boutiqueProductId ? { ...p, marketplace_quantity: Math.max(0, p.marketplace_quantity - quantity) } : p)
                );
            }

            return { previousProducts };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['boutique-products', variables.shopId] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Stock retourné en boutique !');
        },
        onError: (error: any, variables, context) => {
            console.error('Erreur retour stock:', error);
            if (context?.previousProducts) {
                queryClient.setQueryData(['boutique-products', variables.shopId], context.previousProducts);
            }
            toast.error(error.message || 'Erreur lors du retour de stock');
        },
    });
};
