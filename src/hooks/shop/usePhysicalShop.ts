/**
 * Hook pour gérer la boutique physique d'un utilisateur
 * Offline-first : cache IndexedDB + sync Supabase
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { physicalShopStore, type LocalPhysicalShop } from '@/local-storage/stores/BoutiqueStore';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

export const usePhysicalShop = () => {
    const { user } = useAuth();

    const query = useQuery({
        queryKey: ['physical-shop', user?.id],
        queryFn: async () => {
            console.log('🏪 [usePhysicalShop] Fetching shop for user:', user!.id);
            const { data, error } = await supabase
                .from('physical_shops')
                .select('*')
                .eq('owner_id', user!.id)
                .maybeSingle();

            if (error) {
                console.error('🏪 [usePhysicalShop] Error:', error);
                throw error;
            }
            console.log('🏪 [usePhysicalShop] Result:', data);

            // Mettre en cache IndexedDB (non bloquant)
            if (data) {
                physicalShopStore.put({
                    id: data.id,
                    ownerId: data.owner_id,
                    name: data.name,
                    address: data.address,
                    updatedAt: Date.now(),
                }).catch(err => console.warn('🏪 Cache IndexedDB failed:', err));
            }

            return data;
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

    return useQuery({
        queryKey: ['is-shop-owner', user?.id],
        queryFn: async () => {
            console.log('🔍 [useIsShopOwner] Checking for user:', user!.id);
            const { data, error } = await supabase
                .from('physical_shops')
                .select('id')
                .eq('owner_id', user!.id)
                .maybeSingle();

            if (error) {
                console.error('🔍 [useIsShopOwner] Error:', error);
                // En cas d'erreur (offline), utiliser le cache localStorage
                if (cacheKey) {
                    const cached = localStorage.getItem(cacheKey);
                    if (cached !== null) {
                        console.log('🔍 [useIsShopOwner] Using cached value:', cached);
                        return cached === 'true';
                    }
                }
                throw error;
            }
            const result = !!data;
            console.log('🔍 [useIsShopOwner] Result:', result);
            // Persister dans localStorage pour le mode offline
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
