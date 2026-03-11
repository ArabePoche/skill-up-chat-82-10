import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ShopAgent {
    id: string;
    shop_id: string;
    user_id: string | null;
    first_name: string;
    last_name: string;
    role: 'PDG' | 'comptable' | 'vendeur';
    pin_code: string | null;
    username?: string;
    password_hash?: string;
    status: 'active' | 'inactive';
    created_at: string;
}

export const useShopAgents = (shopId?: string) => {
    return useQuery({
        queryKey: ['shop-agents', shopId],
        queryFn: async () => {
            if (!shopId) return [];
            const { data, error } = await supabase
                .from('shop_agents' as any)
                .select('*')
                .eq('shop_id', shopId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data as unknown as ShopAgent[];
        },
        enabled: !!shopId,
    });
};

export const useCreateShopAgent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (agent: Omit<ShopAgent, 'id' | 'created_at' | 'status'>) => {
            const { data, error } = await supabase
                .from('shop_agents' as any)
                .insert(agent)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['shop-agents', variables.shop_id] });
            toast.success('Agent ajouté avec succès');
        },
        onError: (error: any) => {
            console.error('Erreur création agent:', error);
            toast.error("Erreur lors de l'ajout de l'agent");
        },
    });
};

export const useUpdateShopAgent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (agent: Partial<ShopAgent> & { id: string; shop_id: string }) => {
            const { id, shop_id, ...updates } = agent;
            const { data, error } = await supabase
                .from('shop_agents' as any)
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['shop-agents', variables.shop_id] });
            toast.success('Agent mis à jour');
        },
        onError: (error: any) => {
            console.error('Erreur mise à jour agent:', error);
            toast.error("Erreur lors de la mise à jour");
        },
    });
};

export const useDeleteShopAgent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, shop_id }: { id: string; shop_id: string }) => {
            const { error } = await supabase
                .from('shop_agents' as any)
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['shop-agents', variables.shop_id] });
            toast.success('Agent supprimé');
        },
        onError: (error: any) => {
            console.error('Erreur suppression agent:', error);
            toast.error("Erreur lors de la suppression");
        },
    });
};
