import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logShopActivity } from './useShopActivityLogs';

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
    avatar_url?: string | null; // optional picture for agent
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
            
            await logShopActivity({
                shopId: agent.shop_id,
                actionType: 'AGENT',
                details: `Création de l'agent ${agent.first_name} ${agent.last_name} (${agent.role})`
            });
            
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
            await logShopActivity({
                shopId: shop_id,
                actionType: 'AGENT',
                details: `Mise à jour des informations de l'agent ${updates.first_name || ''} ${updates.last_name || ''}`
            });
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

// ------------------------------------------------------------------
// Additional utilities for shop agent management
// ------------------------------------------------------------------

/**
 * Reset an agent password to a provided value.  Owner or admin
 * can use this hook to generate a temporary password.
 */
export const useResetShopAgentPassword = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, shop_id, newPassword }: { id: string; shop_id: string; newPassword: string }) => {
            const { error } = await supabase
                .from('shop_agents' as any)
                .update({ password_hash: newPassword })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['shop-agents', variables.shop_id] });
            toast.success('Mot de passe réinitialisé');
        },
        onError: (error: any) => {
            console.error('Erreur reset password:', error);
            toast.error("Impossible de réinitialiser le mot de passe");
        },
    });
};

/**
 * Upload an avatar image for a shop agent. The file is pushed to
 * the usual `avatars` storage bucket and the agent row is updated
 * with the public URL.  shopId is required to invalidate the
 * corresponding query cache.
 */
export const useShopAgentAvatarUpload = (shopId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ agentId, file }: { agentId: string; file: File }) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `shop_agents/${agentId}/${Date.now()}.${fileExt}`;

            const { error: uploadErr } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });
            if (uploadErr) throw uploadErr;

            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);
            const avatarUrl = urlData.publicUrl;

            const { error: updateErr } = await supabase
                .from('shop_agents' as any)
                .update({ avatar_url: avatarUrl })
                .eq('id', agentId);
            if (updateErr) throw updateErr;

            return avatarUrl;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['shop-agents', shopId] });
            toast.success('Avatar agent mis à jour');
        },
        onError: (error: any) => {
            console.error('Erreur upload avatar agent:', error);
            toast.error("Erreur lors de l'upload de l'avatar");
        },
    });
};
