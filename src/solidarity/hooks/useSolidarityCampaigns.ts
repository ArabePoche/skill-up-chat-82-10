// Hook pour gérer les cagnottes solidaires (CRUD, contributions, config admin)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface SolidarityCampaign {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  goal_amount: number;
  collected_amount: number;
  commission_rate: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'closed';
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  deadline: string | null;
  category: string;
  beneficiary_name: string | null;
  created_at: string;
  updated_at: string;
  creator?: { first_name: string; last_name: string; avatar_url: string | null };
}

export interface SolidarityContribution {
  id: string;
  campaign_id: string;
  contributor_id: string;
  amount: number;
  commission_amount: number;
  message: string | null;
  is_anonymous: boolean;
  created_at: string;
  contributor?: { first_name: string; last_name: string; avatar_url: string | null };
}

export interface SolidarityCommissionSettings {
  id: string;
  default_commission_rate: number;
  min_campaign_goal: number;
  max_campaign_goal: number;
  max_active_campaigns_per_user: number;
  updated_at: string;
}

// Récupérer les campagnes approuvées (liste publique)
export const useSolidarityCampaigns = (statusFilter?: string) => {
  return useQuery({
    queryKey: ['solidarity-campaigns', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('solidarity_campaigns')
        .select('*, creator:profiles!solidarity_campaigns_creator_id_fkey(first_name, last_name, avatar_url)')
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as SolidarityCampaign[];
    },
  });
};

// Récupérer les contributions d'une campagne
export const useCampaignContributions = (campaignId: string | null) => {
  return useQuery({
    queryKey: ['solidarity-contributions', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from('solidarity_contributions')
        .select('*, contributor:profiles!solidarity_contributions_contributor_id_fkey(first_name, last_name, avatar_url)')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SolidarityContribution[];
    },
    enabled: !!campaignId,
  });
};

// Config des commissions
export const useSolidaritySettings = () => {
  return useQuery({
    queryKey: ['solidarity-commission-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solidarity_commission_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data as SolidarityCommissionSettings;
    },
  });
};

// Créer une campagne
export const useCreateCampaign = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: {
      title: string;
      description: string;
      goal_amount: number;
      deadline?: string;
      category?: string;
      beneficiary_name?: string;
      image_url?: string;
      commission_rate: number;
    }) => {
      if (!user?.id) throw new Error('Non connecté');
      const { data, error } = await supabase
        .from('solidarity_campaigns')
        .insert({
          ...campaign,
          creator_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solidarity-campaigns'] });
      toast.success('Cagnotte soumise pour validation !');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la création');
    },
  });
};

// Contribuer à une campagne (débite SC)
export const useContribute = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, amount, message, isAnonymous, commissionRate }: {
      campaignId: string;
      amount: number;
      message?: string;
      isAnonymous?: boolean;
      commissionRate: number;
    }) => {
      if (!user?.id) throw new Error('Non connecté');
      const commissionAmount = Math.round(amount * commissionRate / 100);
      
      // Vérifier le solde SC
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('soumboulah_cash')
        .eq('user_id', user.id)
        .single();

      if (!wallet || wallet.soumboulah_cash < amount) {
        throw new Error('Solde SC insuffisant');
      }

      // Insérer la contribution
      const { error: contribErr } = await supabase
        .from('solidarity_contributions')
        .insert({
          campaign_id: campaignId,
          contributor_id: user.id,
          amount,
          commission_amount: commissionAmount,
          message: message || null,
          is_anonymous: isAnonymous || false,
        });
      if (contribErr) throw contribErr;

      // Débiter le wallet SC
      const { error: walletErr } = await supabase
        .from('user_wallets')
        .update({ soumboulah_cash: wallet.soumboulah_cash - amount })
        .eq('user_id', user.id);
      if (walletErr) throw walletErr;

      // Mettre à jour le montant collecté
      const { data: campaign } = await supabase
        .from('solidarity_campaigns')
        .select('collected_amount, goal_amount')
        .eq('id', campaignId)
        .single();
      if (campaign) {
        const newCollected = Number(campaign.collected_amount) + amount;
        const updateData: any = { collected_amount: newCollected };
        if (newCollected >= Number(campaign.goal_amount)) {
          updateData.status = 'completed';
        }
        await supabase.from('solidarity_campaigns').update(updateData).eq('id', campaignId);
      }

      // Enregistrer la transaction wallet
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        currency: 'soumboulah_cash',
        amount: -amount,
        transaction_type: 'solidarity_contribution',
        description: `Contribution cagnotte solidaire`,
        reference_id: campaignId,
        reference_type: 'solidarity_campaign',
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solidarity-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['solidarity-contributions'] });
      queryClient.invalidateQueries({ queryKey: ['user-wallet'] });
      toast.success('Contribution envoyée avec succès !');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la contribution');
    },
  });
};

// Admin : approuver / rejeter une campagne
export const useAdminCampaignAction = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, action, rejectionReason }: {
      campaignId: string;
      action: 'approved' | 'rejected';
      rejectionReason?: string;
    }) => {
      if (!user?.id) throw new Error('Non connecté');
      const updateData: any = {
        status: action,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (action === 'rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }
      const { error } = await supabase
        .from('solidarity_campaigns')
        .update(updateData)
        .eq('id', campaignId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['solidarity-campaigns'] });
      toast.success(vars.action === 'approved' ? 'Cagnotte approuvée !' : 'Cagnotte rejetée');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
};

// Admin : mettre à jour la config des commissions
export const useUpdateSolidaritySettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<SolidarityCommissionSettings>) => {
      if (!user?.id) throw new Error('Non connecté');
      const { error } = await supabase
        .from('solidarity_commission_settings')
        .update({ ...settings, updated_by: user.id, updated_at: new Date().toISOString() })
        .not('id', 'is', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solidarity-commission-settings'] });
      toast.success('Paramètres mis à jour');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
};
