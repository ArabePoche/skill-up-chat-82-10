import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface UserSubscription {
  id: string;
  user_id: string;
  formation_id: string;
  plan_type: 'free' | 'standard' | 'premium' | 'groupe';
  created_at: string;
  updated_at: string;
}

export const useUserSubscription = (formationId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['user-subscription', user?.id, formationId],
    queryFn: async (): Promise<UserSubscription | null> => {
      if (!user?.id || !formationId) return null;

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('formation_id', formationId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user subscription:', error);
        return null;
      }

      return data as UserSubscription;
    },
    enabled: !!user?.id && !!formationId,
  });

  const createSubscription = useMutation({
    mutationFn: async ({ planType }: { planType: 'free' | 'standard' | 'premium' | 'groupe' }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Vérifier si l'abonnement existe déjà
      const { data: existingSubscription } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('formation_id', formationId)
        .maybeSingle();

      if (existingSubscription) {
        // Mettre à jour l'abonnement existant
        const { data, error } = await supabase
          .from('user_subscriptions')
          .update({ plan_type: planType })
          .eq('user_id', user.id)
          .eq('formation_id', formationId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Créer un nouvel abonnement
        const { data, error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: user.id,
            formation_id: formationId,
            plan_type: planType
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      // Invalider toutes les queries liées aux abonnements et aux restrictions
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['formation-pricing'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-limits'] });
      toast.success('Abonnement mis à jour avec succès');
    },
    onError: (error) => {
      console.error('Error creating/updating subscription:', error);
      toast.error('Erreur lors de la mise à jour de l\'abonnement');
    },
  });

  return {
    subscription,
    isLoading,
    createSubscription: createSubscription.mutate,
    isCreating: createSubscription.isPending,
  };
};