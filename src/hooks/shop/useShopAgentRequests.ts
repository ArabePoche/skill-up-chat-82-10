/**
 * Hook pour gérer les demandes d'accès agent à une boutique
 * - Utilisateur demande à rejoindre une boutique (status: pending)
 * - Propriétaire approuve avec un rôle (status: active)
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface AgentRequest {
  id: string;
  shop_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  role: string;
  requested_role: string | null;
  status: string | null;
  created_at: string | null;
  email: string | null;
}

/** Vérifie si l'utilisateur courant a déjà une demande ou est agent d'une boutique */
export const useMyAgentStatus = (shopId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-agent-status', user?.id, shopId],
    queryFn: async () => {
      if (!user?.id || !shopId) return null;

      const { data, error } = await supabase
        .from('shop_agents' as any)
        .select('id, status, role, requested_role')
        .eq('user_id', user.id)
        .eq('shop_id', shopId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as { id: string; status: string; role: string; requested_role: string | null } | null;
    },
    enabled: !!user?.id && !!shopId,
  });
};

/** Vérifie si l'utilisateur est agent (actif) dans n'importe quelle boutique */
export const useIsShopAgent = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['is-shop-agent', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('shop_agents' as any)
        .select('id, shop_id, status, role')
        .eq('user_id', user.id)
        .in('status', ['active', 'pending']);

      if (error) throw error;
      return data as unknown as { id: string; shop_id: string; status: string; role: string }[] | null;
    },
    enabled: !!user?.id,
  });
};

/** Demander à rejoindre une boutique */
export const useRequestAgentAccess = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      shopId,
      firstName,
      lastName,
      requestedRole,
      message,
    }: {
      shopId: string;
      firstName: string;
      lastName: string;
      requestedRole: string;
      message?: string;
    }) => {
      if (!user?.id) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('shop_agents' as any)
        .insert({
          shop_id: shopId,
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          role: 'pending',
          requested_role: requestedRole,
          status: 'pending',
          email: user.email,
        })
        .select()
        .single();

      if (error) throw error;

      // Notifier le propriétaire de la boutique
      const { data: shop } = await supabase
        .from('physical_shops')
        .select('owner_id, name')
        .eq('id', shopId)
        .single();

      if (shop) {
        await supabase.from('notifications').insert({
          user_id: shop.owner_id,
          type: 'agent_request',
          title: 'Nouvelle demande d\'agent',
          message: `${firstName} ${lastName} souhaite rejoindre "${shop.name}" en tant que ${requestedRole}`,
          is_read: false,
        });
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Demande envoyée ! Le propriétaire sera notifié.');
      queryClient.invalidateQueries({ queryKey: ['my-agent-status'] });
      queryClient.invalidateQueries({ queryKey: ['is-shop-agent'] });
      queryClient.invalidateQueries({ queryKey: ['pending-agent-requests'] });
    },
    onError: (error: any) => {
      console.error('Erreur demande agent:', error);
      toast.error(error.message || 'Impossible d\'envoyer la demande');
    },
  });
};

/** Récupérer les demandes en attente pour une boutique (côté propriétaire) */
export const usePendingAgentRequests = (shopId?: string) => {
  return useQuery({
    queryKey: ['pending-agent-requests', shopId],
    queryFn: async () => {
      if (!shopId) return [];

      const { data, error } = await supabase
        .from('shop_agents' as any)
        .select('*')
        .eq('shop_id', shopId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as AgentRequest[];
    },
    enabled: !!shopId,
  });
};

/** Approuver une demande d'agent avec un rôle */
export const useApproveAgentRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agentId,
      shopId,
      role,
    }: {
      agentId: string;
      shopId: string;
      role: string;
    }) => {
      const { data, error } = await supabase
        .from('shop_agents' as any)
        .update({ status: 'active', role })
        .eq('id', agentId)
        .select()
        .single();

      if (error) throw error;

      // Notifier l'agent
      const agent = data as any;
      if (agent.user_id) {
        await supabase.from('notifications').insert({
          user_id: agent.user_id,
          type: 'agent_approved',
          title: 'Demande approuvée !',
          message: `Vous avez été accepté en tant que ${role}. Vous pouvez maintenant accéder à la gestion.`,
          is_read: false,
        });
      }

      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Agent approuvé avec succès');
      queryClient.invalidateQueries({ queryKey: ['pending-agent-requests', variables.shopId] });
      queryClient.invalidateQueries({ queryKey: ['shop-agents', variables.shopId] });
    },
    onError: (error: any) => {
      console.error('Erreur approbation:', error);
      toast.error("Erreur lors de l'approbation");
    },
  });
};

/** Rejeter une demande d'agent */
export const useRejectAgentRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agentId,
      shopId,
    }: {
      agentId: string;
      shopId: string;
    }) => {
      // Récupérer l'agent avant suppression pour notifier
      const { data: agent } = await supabase
        .from('shop_agents' as any)
        .select('user_id, first_name')
        .eq('id', agentId)
        .single();

      const { error } = await supabase
        .from('shop_agents' as any)
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      if (agent && (agent as any).user_id) {
        await supabase.from('notifications').insert({
          user_id: (agent as any).user_id,
          type: 'agent_rejected',
          title: 'Demande refusée',
          message: 'Votre demande pour rejoindre la boutique a été refusée.',
          is_read: false,
        });
      }
    },
    onSuccess: (_, variables) => {
      toast.success('Demande refusée');
      queryClient.invalidateQueries({ queryKey: ['pending-agent-requests', variables.shopId] });
    },
    onError: (error: any) => {
      console.error('Erreur rejet:', error);
      toast.error('Erreur lors du rejet');
    },
  });
};
