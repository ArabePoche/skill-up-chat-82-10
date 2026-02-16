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
    const [cachedShop, setCachedShop] = useState<LocalPhysicalShop | null>(null);

    // Charger le cache au montage
    useEffect(() => {
        if (!user?.id) return;
        physicalShopStore.getByOwner(user.id).then(shops => {
            if (shops.length > 0) setCachedShop(shops[0]);
        }).catch(() => { });
    }, [user?.id]);

    const query = useQuery({
        queryKey: ['physical-shop', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('physical_shops')
                .select('*')
                .eq('owner_id', user!.id)
                .maybeSingle();

            if (error) throw error;

            // Mettre en cache IndexedDB
            if (data) {
                const localShop: LocalPhysicalShop = {
                    id: data.id,
                    ownerId: data.owner_id,
                    name: data.name,
                    address: data.address,
                    updatedAt: Date.now(),
                };
                await physicalShopStore.put(localShop);
                setCachedShop(localShop);
            }

            return data;
        },
        enabled: !!user?.id,
        initialData: cachedShop ? {
            id: cachedShop.id,
            owner_id: cachedShop.ownerId,
            name: cachedShop.name,
            address: cachedShop.address,
            created_at: '',
            updated_at: '',
        } : undefined,
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

    return useQuery({
        queryKey: ['is-shop-owner', user?.id],
        queryFn: async () => {
            // Vérifier si l'utilisateur a une boutique physique
            const { data, error } = await supabase
                .from('physical_shops')
                .select('id')
                .eq('owner_id', user!.id)
                .maybeSingle();

            if (error) throw error;
            return !!data;
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 10,
    });
};
