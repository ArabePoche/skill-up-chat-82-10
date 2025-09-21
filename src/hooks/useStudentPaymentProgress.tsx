import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Hook pour récupérer la progression de paiement d'un étudiant
 * pour une formation donnée
 */
export const useStudentPaymentProgress = (formationId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-payment-progress', user?.id, formationId],
    queryFn: async () => {
      if (!user?.id || !formationId) return null;

      const { data, error } = await supabase
        .from('student_payment_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('formation_id', formationId)
        .maybeSingle();

      if (error) {
        console.error('Erreur lors de la récupération du progrès de paiement:', error);
        throw error;
      }

      // Si aucun enregistrement trouvé, retourner des valeurs par défaut
      if (!data) {
        return {
          total_days_remaining: 0,
          last_payment_date: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      // Calculer les jours restants en temps réel
      if (data.last_payment_date && data.total_days_remaining > 0) {
        const lastPaymentDate = new Date(data.last_payment_date);
        const currentDate = new Date();
        const daysSincePayment = Math.floor((currentDate.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculer les jours réellement restants
        const actualDaysRemaining = Math.max(0, data.total_days_remaining - daysSincePayment);
        
        return {
          ...data,
          total_days_remaining: actualDaysRemaining
        };
      }

      return data;
    },
    enabled: !!user?.id && !!formationId,
    staleTime: 0,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

/**
 * Hook pour récupérer l'historique des paiements d'un étudiant
 */
export const useStudentPaymentHistory = (formationId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-payment-history', user?.id, formationId],
    queryFn: async () => {
      if (!user?.id || !formationId) return [];

      const { data, error } = await supabase
        .from('student_payment')
        .select('*')
        .eq('user_id', user.id)
        .eq('formation_id', formationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erreur lors de la récupération de l'historique des paiements:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.id && !!formationId,
    staleTime: 0,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};