/**
 * Hooks pour gérer la progression et l'historique des paiements étudiants
 * Avec support offline via cache IndexedDB
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { calculateRemainingDays } from '@/utils/paymentCalculations';
import { useOfflineSync } from '@/offline/hooks/useOfflineSync';
import { offlineStore } from '@/offline/utils/offlineStore';

const getDefaultPaymentProgress = () => ({
  total_days_remaining: 0,
  last_payment_date: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

const isRecoverableSupabaseFetchError = (error: {
  message?: string;
  details?: string;
  code?: string;
  status?: number;
} | null) => {
  if (!error) return false;

  const message = (error.message || '').toLowerCase();
  const details = (error.details || '').toLowerCase();

  return (
    error.status === 401 ||
    message.includes('failed to fetch') ||
    details.includes('failed to fetch') ||
    message.includes('network') ||
    details.includes('network')
  );
};

/**
 * Hook pour récupérer la progression de paiement d'un étudiant
 * pour une formation donnée
 */
export const useStudentPaymentProgress = (formationId: string) => {
  const { user } = useAuth();
  const { isOnline } = useOfflineSync();

  return useQuery({
    queryKey: ['student-payment-progress', user?.id, formationId],
    queryFn: async () => {
      if (!user?.id || !formationId) return null;

      // Mode hors ligne : utiliser le cache
      if (!isOnline) {
        console.log('📦 Offline - loading cached payment progress');
        const cached = await offlineStore.getCachedQuery(
          `["payment-progress-offline","${user.id}","${formationId}"]`
        );
        return cached || getDefaultPaymentProgress();
      }

      const { data, error } = await supabase
        .from('student_payment_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('formation_id', formationId)
        .maybeSingle();

      if (error) {
        console.error('Erreur lors de la récupération du progrès de paiement:', error);
        // Fallback vers le cache en cas d'erreur
        const cached = await offlineStore.getCachedQuery(
          `["payment-progress-offline","${user.id}","${formationId}"]`
        );
        if (cached) return cached;

        if (isRecoverableSupabaseFetchError(error)) {
          return getDefaultPaymentProgress();
        }

        throw error;
      }

      // Si aucun enregistrement trouvé, retourner des valeurs par défaut
      if (!data) {
        return getDefaultPaymentProgress();
      }

      // Calculer les jours restants en temps réel
      const actualDaysRemaining = calculateRemainingDays(
        data.total_days_remaining,
        data.last_payment_date
      );

      const result = {
        ...data,
        total_days_remaining: actualDaysRemaining
      };

      // Sauvegarder dans le cache pour accès offline
      await offlineStore.cacheQuery(
        `["payment-progress-offline","${user.id}","${formationId}"]`,
        result,
        24 * 60 * 60 * 1000 // 24h
      );

      return result;
    },
    enabled: !!user?.id && !!formationId,
    staleTime: isOnline ? 0 : Infinity,
    refetchInterval: isOnline ? 5000 : false,
    refetchOnWindowFocus: isOnline,
    refetchOnReconnect: true,
    retry: isOnline ? 3 : false,
  });
};

/**
 * Hook pour récupérer l'historique des paiements d'un étudiant
 */
export const useStudentPaymentHistory = (formationId: string) => {
  const { user } = useAuth();
  const { isOnline } = useOfflineSync();

  return useQuery({
    queryKey: ['student-payment-history', user?.id, formationId],
    queryFn: async () => {
      if (!user?.id || !formationId) return [];

      // Mode hors ligne : utiliser le cache
      if (!isOnline) {
        const cached = await offlineStore.getCachedQuery(
          `["payment-history-offline","${user.id}","${formationId}"]`
        );
        return cached || [];
      }

      const { data, error } = await supabase
        .from('student_payment')
        .select('*')
        .eq('user_id', user.id)
        .eq('formation_id', formationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erreur lors de la récupération de l'historique des paiements:", error);
        const cached = await offlineStore.getCachedQuery(
          `["payment-history-offline","${user.id}","${formationId}"]`
        );
        if (cached) return cached;

        if (isRecoverableSupabaseFetchError(error)) {
          return [];
        }

        throw error;
      }

      // Sauvegarder dans le cache pour accès offline
      if (data) {
        await offlineStore.cacheQuery(
          `["payment-history-offline","${user.id}","${formationId}"]`,
          data,
          24 * 60 * 60 * 1000
        );
      }

      return data || [];
    },
    enabled: !!user?.id && !!formationId,
    staleTime: isOnline ? 0 : Infinity,
    refetchInterval: isOnline ? 5000 : false,
    refetchOnWindowFocus: isOnline,
    refetchOnReconnect: true,
    retry: isOnline ? 3 : false,
  });
};
