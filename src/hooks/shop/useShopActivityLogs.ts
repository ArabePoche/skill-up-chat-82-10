import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ShopActivityLog {
  id: string;
  shop_id: string;
  agent_id: string | null;
  action_type: string;
  details: string;
  created_at: string;
  agent?: {
    first_name: string;
    last_name: string;
  };
}

export const logShopActivity = async ({
  shopId,
  agentId,
  actionType,
  details,
}: {
  shopId: string;
  agentId?: string;
  actionType: string;
  details: string;
}) => {
  if (!shopId) return null;
  try {
    const { data, error } = await supabase
      .from('shop_activity_logs')
      .insert({
        shop_id: shopId,
        agent_id: agentId || null,
        action_type: actionType,
        details,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur insertion log:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Exception logShopActivity:', err);
    return null;
  }
};

export const useShopActivityLogs = (shopId?: string) => {
  return useQuery({
    queryKey: ['shop-activity-logs', shopId],
    queryFn: async () => {
      if (!shopId) return [];

      const { data, error } = await supabase
        .from('shop_activity_logs')
        .select(`
          *,
          agent:shop_agents (
            first_name,
            last_name
          )
        `)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(150);

      if (error) throw error;
      return (data as ShopActivityLog[]) || [];
    },
    enabled: !!shopId,
  });
};

export const useLogShopActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shopId,
      agentId,
      actionType,
      details,
    }: {
      shopId: string;
      agentId?: string;
      actionType: string;
      details: string;
    }) => {
      if (!shopId) return null;

      const { data, error } = await supabase
        .from('shop_activity_logs')
        .insert({
          shop_id: shopId,
          agent_id: agentId || null,
          action_type: actionType,
          details,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['shop-activity-logs', variables.shopId] });
      }
    },
    onError: (error) => {
      console.error('Erreur log activity:', error);
    }
  });
};