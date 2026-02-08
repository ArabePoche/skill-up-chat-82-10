/**
 * Hook pour gérer l'abonnement utilisateur à une formation
 * Avec support offline via cache IndexedDB
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOfflineSync } from '@/offline/hooks/useOfflineSync';
import { offlineStore } from '@/offline/utils/offlineStore';
import { toast } from 'sonner';

interface UserSubscription {
  id: string;
  user_id: string;
  formation_id: string;
  plan_type: 'free' | 'standard' | 'premium' | 'groupe';
  created_at: string;
  updated_at: string;
}

export const useUserSubscription = (formationId: string, userId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isOnline } = useOfflineSync();
  
  // Utiliser l'userId fourni ou celui de l'utilisateur connecté
  const targetUserId = userId || user?.id;

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['user-subscription', targetUserId, formationId],
    queryFn: async (): Promise<UserSubscription | null> => {
      if (!targetUserId || !formationId) return null;

      // Mode hors ligne : utiliser le cache
      if (!isOnline) {
        console.log('📦 Offline - loading cached subscription');
        const cached = await offlineStore.getCachedQuery(
          `["user-subscription-offline","${targetUserId}","${formationId}"]`
        );
        return cached as UserSubscription | null;
      }

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('formation_id', formationId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user subscription:', error);
        // Fallback vers le cache en cas d'erreur
        const cached = await offlineStore.getCachedQuery(
          `["user-subscription-offline","${targetUserId}","${formationId}"]`
        );
        return cached as UserSubscription | null;
      }

      // Sauvegarder dans le cache pour accès offline
      if (data) {
        await offlineStore.cacheQuery(
          `["user-subscription-offline","${targetUserId}","${formationId}"]`,
          data,
          30 * 24 * 60 * 60 * 1000
        );
      }

      return data as UserSubscription;
    },
    enabled: !!targetUserId && !!formationId,
    retry: isOnline ? 3 : false,
    staleTime: isOnline ? 1000 * 60 * 5 : Infinity,
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
