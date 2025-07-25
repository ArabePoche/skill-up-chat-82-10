
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FormationPricingOption {
  id?: string;
  formation_id: string;
  plan_type: 'free' | 'standard' | 'premium';
  price_monthly?: number;
  price_yearly?: number;
  allow_discussion: boolean;
  allow_exercises: boolean;
  allow_calls: boolean;
  call_type: 'none' | 'audio' | 'video' | 'both';
  allowed_call_days: string[];
  allowed_response_days: string[];
  message_limit_per_day?: number;
  time_limit_minutes_per_day?: number;
  time_limit_minutes_per_week?: number;
  lesson_access: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useFormationPricing = (formationId: string) => {
  const queryClient = useQueryClient();

  const { data: pricingOptions, isLoading, error } = useQuery({
    queryKey: ['formation-pricing', formationId],
    queryFn: async () => {
      if (!formationId) return [];

      const { data, error } = await supabase
        .from('formation_pricing_options')
        .select('*')
        .eq('formation_id', formationId)
        .order('plan_type');

      if (error) {
        console.error('Error fetching pricing options:', error);
        throw error;
      }

      return data as FormationPricingOption[];
    },
    enabled: !!formationId,
  });

  const savePricingMutation = useMutation({
    mutationFn: async (options: FormationPricingOption[]) => {
      console.log('Saving pricing options:', options);
      
      // Supprimer les anciennes options
      const { error: deleteError } = await supabase
        .from('formation_pricing_options')
        .delete()
        .eq('formation_id', formationId);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }

      // Préparer les données à insérer
      const dataToInsert = options.map(option => {
        const insertData = {
          formation_id: formationId,
          plan_type: option.plan_type,
          price_monthly: option.price_monthly ?? null,
          price_yearly: option.price_yearly ?? null,
          allow_discussion: option.allow_discussion,
          allow_exercises: option.allow_exercises,
          allow_calls: option.allow_calls,
          call_type: option.call_type || 'none',
          allowed_call_days: option.allowed_call_days || [],
          allowed_response_days: option.allowed_response_days || [],
          message_limit_per_day: option.message_limit_per_day ?? null,
          time_limit_minutes_per_day: option.time_limit_minutes_per_day ?? null,
          time_limit_minutes_per_week: option.time_limit_minutes_per_week ?? null,
          lesson_access: option.lesson_access || [],
          is_active: option.is_active
        };
        console.log('Prepared insert data:', insertData);
        return insertData;
      });

      console.log('Data to insert:', dataToInsert);

      // Insérer les nouvelles options
      const { data, error: insertError } = await supabase
        .from('formation_pricing_options')
        .insert(dataToInsert)
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Successfully inserted:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formation-pricing', formationId] });
      toast.success('Options de tarification sauvegardées avec succès');
    },
    onError: (error) => {
      console.error('Error saving pricing options:', error);
      toast.error('Erreur lors de la sauvegarde des options de tarification');
    },
  });

  const getUserPlan = async (userId: string) => {
    try {
      // Cette fonction devra être implémentée pour récupérer l'abonnement actuel de l'utilisateur
      // Pour l'instant, on retourne 'free' par défaut
      return 'free';
    } catch (error) {
      console.error('Error getting user plan:', error);
      return 'free';
    }
  };

  const checkUserAccess = (userPlan: string, feature: string) => {
    const plan = pricingOptions?.find(p => p.plan_type === userPlan && p.is_active);
    if (!plan) return false;

    switch (feature) {
      case 'discussion':
        return plan.allow_discussion;
      case 'exercises':
        return plan.allow_exercises;
      case 'calls':
        return plan.allow_calls;
      default:
        return false;
    }
  };

  const getUserLimits = (userPlan: string) => {
    const plan = pricingOptions?.find(p => p.plan_type === userPlan && p.is_active);
    if (!plan) return null;

    return {
      messageLimit: plan.message_limit_per_day,
      timeLimit: {
        daily: plan.time_limit_minutes_per_day,
        weekly: plan.time_limit_minutes_per_week,
      },
      allowedCallDays: plan.allowed_call_days,
      allowedResponseDays: plan.allowed_response_days,
      accessibleLessons: plan.lesson_access,
      callType: plan.call_type,
    };
  };

  // Fonction helper pour obtenir le texte explicite des fonctionnalités
  const getFeatureDisplayText = (feature: string) => {
    switch (feature) {
      case 'discussion':
        return 'Discuter avec les profs';
      case 'exercises':
        return 'Exercices';
      case 'calls':
        return 'Appels';
      default:
        return feature;
    }
  };

  return {
    pricingOptions,
    isLoading,
    error,
    savePricingOptions: savePricingMutation.mutate,
    isSaving: savePricingMutation.isPending,
    getUserPlan,
    checkUserAccess,
    getUserLimits,
    getFeatureDisplayText,
  };
};

export default useFormationPricing;
