/**
 * Hook pour gérer la boutique physique d'un utilisateur
 * Offline-first : cache IndexedDB + sync Supabase
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfflineQuery } from '@/offline/hooks/useOfflineQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { physicalShopStore } from '@/local-storage/stores/BoutiqueStore';
import { toast } from 'sonner';

export const usePhysicalShop = () => {
    const { user } = useAuth();

    const query = useOfflineQuery<any>({
        queryKey: ['physical-shop', user?.id],
        queryFn: async () => {
            console.log('🏪 [usePhysicalShop] Fetching shop for user:', user!.id);
            // On cherche d'abord si l'utilisateur est propriétaire
            const { data: ownShop, error: ownError } = await supabase
                .from('physical_shops')
                .select('*')
                .eq('owner_id', user!.id)
                .maybeSingle();

            if (ownShop) return ownShop;

            // Sinon on cherche s'il est agent dans une boutique
            const { data: agentData, error: agentError } = await supabase
                .from('shop_agents' as any)
                .select('shop_id')
                .eq('user_id', user!.id)
                .maybeSingle();

            let agentShop = null;
            if (agentData) {
                const { data: fetchedAgentShop } = await supabase
                    .from('physical_shops')
                    .select('*')
                    .eq('id', (agentData as any).shop_id)
                    .maybeSingle();
                agentShop = fetchedAgentShop;
            }

            const shopToCache = ownShop || agentShop;

            // Mettre en cache IndexedDB (non bloquant)
            if (shopToCache) {
                import('@/local-storage/stores/BoutiqueStore').then(({ physicalShopStore }) => {
                    physicalShopStore.put({
                        id: shopToCache.id,
                        ownerId: shopToCache.owner_id,
                        name: shopToCache.name,
                        address: shopToCache.address,
                        updatedAt: Date.now(),
                    }).catch(err => console.warn('🏪 Cache IndexedDB failed:', err));
                });
            }

            return shopToCache;
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5,
    });

    return query;
};

export const useCreatePhysicalShop = () => {
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

            // Cacher le résultat
            await physicalShopStore.put({
                id: data.id,
                ownerId: data.owner_id,
                name: data.name,
                address: data.address,
                updatedAt: Date.now(),
            });

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['physical-shop'] });
            toast.success('Boutique créée avec succès !');
        },
        onError: (error: any) => {
            console.error('Erreur création boutique:', error);
            toast.error('Erreur lors de la création de la boutique');
        },
    });
};

export const useIsShopOwner = () => {
    const { user } = useAuth();
    const cacheKey = user?.id ? `is-shop-owner-${user.id}` : null;

    return useOfflineQuery<boolean>({
        queryKey: ['is-shop-owner', user?.id],
        queryFn: async () => {
            console.log('🔍 [useIsShopOwner] Checking for user:', user!.id);

            // Propriétaire ?
            const { data: shops, error: shopError } = await supabase
                .from('physical_shops')
                .select('id')
                .eq('owner_id', user!.id)
                .limit(1);

            if (shops && shops.length > 0) {
                console.log('🔍 [useIsShopOwner] User is owner');
                if (cacheKey) localStorage.setItem(cacheKey, 'true');
                return true;
            }

            // Agent ?
            const { data: agentData, error: agentError } = await supabase
                .from('shop_agents' as any)
                .select('id')
                .eq('user_id', user!.id)
                .eq('status', 'active')
                .limit(1);

            const result = !!(agentData && agentData.length > 0);
            console.log('🔍 [useIsShopOwner] Result (Agent check):', result);

            if (cacheKey) {
                localStorage.setItem(cacheKey, String(result));
            }
            return result;
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 10,
        // Utiliser le cache localStorage comme initialData pour affichage immédiat offline
        initialData: cacheKey ? (() => {
            const cached = localStorage.getItem(cacheKey);
            return cached !== null ? cached === 'true' : undefined;
        })() : undefined,
    });
};
