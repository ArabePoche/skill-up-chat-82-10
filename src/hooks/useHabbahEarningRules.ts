// Hook pour récupérer les règles de gain Habbah configurées par les admins
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EarningRule {
  action_type: string;
  action_label: string;
  habbah_amount: number;
  daily_limit: number;
  monthly_limit: number;
  cooldown_seconds: number;
  is_active: boolean;
}

/** Récupère le montant de Habbah pour une action donnée depuis la config admin */
export const useHabbahEarningRules = () => {
  const { data: rules = [] } = useQuery({
    queryKey: ['habbah-earning-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habbah_earning_rules')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Erreur chargement règles Habbah:', error);
        return [];
      }
      return data as EarningRule[];
    },
    staleTime: 5 * 60 * 1000, // Cache 5 min
  });

  const getReward = (actionType: string): { amount: number; label: string } | null => {
    const rule = rules.find(r => r.action_type === actionType);
    if (!rule) return null;
    return { amount: rule.habbah_amount, label: rule.action_label };
  };

  return { rules, getReward };
};
