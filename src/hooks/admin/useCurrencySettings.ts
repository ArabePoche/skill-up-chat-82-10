/**
 * Hook admin pour gérer les paramètres configurables du système monétaire
 * (conversion, règles Habbah, limites globales, anti-fraude)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConversionSettings {
  id: string;
  habbah_per_sb: number;
  max_conversions_per_day: number;
  max_conversions_per_month: number;
  conversion_delay_hours: number;
  is_conversion_enabled: boolean;
  updated_at: string;
}

export interface HabbahEarningRule {
  id: string;
  action_type: string;
  action_label: string;
  habbah_amount: number;
  daily_limit: number;
  monthly_limit: number;
  cooldown_seconds: number;
  is_active: boolean;
}

export interface GlobalLimits {
  id: string;
  max_habbah_per_day: number;
  max_habbah_per_month: number;
  min_trust_score: number;
  max_sb_percentage_for_digital: number;
  is_sb_enabled_for_digital: boolean;
}

export interface AntifraudSettings {
  id: string;
  suspicious_threshold_per_hour: number;
  auto_block_enabled: boolean;
  pending_validation_enabled: boolean;
  pending_validation_delay_hours: number;
}

export const useCurrencySettings = () => {
  const queryClient = useQueryClient();

  const conversionQuery = useQuery({
    queryKey: ['currency-conversion-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currency_conversion_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data as ConversionSettings;
    },
  });

  const earningRulesQuery = useQuery({
    queryKey: ['habbah-earning-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habbah_earning_rules')
        .select('*')
        .order('action_type');
      if (error) throw error;
      return (data || []) as HabbahEarningRule[];
    },
  });

  const globalLimitsQuery = useQuery({
    queryKey: ['currency-global-limits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currency_global_limits')
        .select('*')
        .single();
      if (error) throw error;
      return data as GlobalLimits;
    },
  });

  const antifraudQuery = useQuery({
    queryKey: ['currency-antifraud-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currency_antifraud_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data as AntifraudSettings;
    },
  });

  const updateConversion = useMutation({
    mutationFn: async (updates: Partial<ConversionSettings>) => {
      const { error } = await supabase
        .from('currency_conversion_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', conversionQuery.data!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currency-conversion-settings'] });
      toast.success('Paramètres de conversion mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const updateEarningRule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HabbahEarningRule> & { id: string }) => {
      const { error } = await supabase
        .from('habbah_earning_rules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habbah-earning-rules'] });
      toast.success('Règle mise à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const updateGlobalLimits = useMutation({
    mutationFn: async (updates: Partial<GlobalLimits>) => {
      const { error } = await supabase
        .from('currency_global_limits')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', globalLimitsQuery.data!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currency-global-limits'] });
      toast.success('Limites globales mises à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const updateAntifraud = useMutation({
    mutationFn: async (updates: Partial<AntifraudSettings>) => {
      const { error } = await supabase
        .from('currency_antifraud_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', antifraudQuery.data!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currency-antifraud-settings'] });
      toast.success('Paramètres anti-fraude mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  return {
    conversion: conversionQuery.data,
    earningRules: earningRulesQuery.data || [],
    globalLimits: globalLimitsQuery.data,
    antifraud: antifraudQuery.data,
    isLoading: conversionQuery.isLoading || earningRulesQuery.isLoading || globalLimitsQuery.isLoading || antifraudQuery.isLoading,
    updateConversion: updateConversion.mutate,
    updateEarningRule: updateEarningRule.mutate,
    updateGlobalLimits: updateGlobalLimits.mutate,
    updateAntifraud: updateAntifraud.mutate,
    isSaving: updateConversion.isPending || updateEarningRule.isPending || updateGlobalLimits.isPending || updateAntifraud.isPending,
  };
};
