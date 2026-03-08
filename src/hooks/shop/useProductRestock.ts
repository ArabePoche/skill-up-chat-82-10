/**
 * Hook de gestion des abonnements de réapprovisionnement produit
 * Permet aux utilisateurs de s'abonner/désabonner aux notifications de restock
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useProductRestock = (productId?: string, userId?: string) => {
    const queryClient = useQueryClient();

    const { data: isSubscribed, isLoading } = useQuery({
        queryKey: ['restock-subscription', productId, userId],
        queryFn: async () => {
            if (!productId || !userId) return false;
            const { data, error } = await (supabase
                .from('product_restock_subscriptions' as any)
                .select('id')
                .eq('product_id', productId)
                .eq('user_id', userId)
                .maybeSingle() as any);

            if (error) throw error;
            return !!data;
        },
        enabled: !!productId && !!userId,
    });

    const subscribe = useMutation({
        mutationFn: async () => {
            if (!productId || !userId) throw new Error('Product ID and User ID are required');
            const { error } = await (supabase
                .from('product_restock_subscriptions' as any)
                .insert({ product_id: productId, user_id: userId }) as any);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['restock-subscription', productId, userId] });
            toast.success('Vous serez notifié dès que ce produit sera de nouveau disponible.');
        },
        onError: (error: any) => {
            console.error('Error subscribing to restock:', error);
            toast.error("Erreur lors de l'inscription à la notification.");
        },
    });

    const unsubscribe = useMutation({
        mutationFn: async () => {
            if (!productId || !userId) throw new Error('Product ID and User ID are required');
            const { error } = await (supabase
                .from('product_restock_subscriptions' as any)
                .delete()
                .eq('product_id', productId)
                .eq('user_id', userId) as any);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['restock-subscription', productId, userId] });
            toast.success('Notification annulée.');
        },
        onError: (error: any) => {
            console.error('Error unsubscribing from restock:', error);
            toast.error('Erreur lors de la désinscription.');
        },
    });

    return {
        isSubscribed,
        isLoading,
        subscribe: subscribe.mutate,
        isSubscribing: subscribe.isPending,
        unsubscribe: unsubscribe.mutate,
        isUnsubscribing: unsubscribe.isPending,
    };
};
