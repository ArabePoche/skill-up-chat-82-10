import { useUserSubscription } from './useUserSubscription';
import { useStudentPaymentProgress } from './useStudentPaymentProgress';
import { usePlanLimits } from '@/plan-limits/hooks/usePlanLimits';

/**
 * Hook centralisé pour le contrôle d'accès
 * Vérifie les jours restants et les limites d'abonnement
 */
export const useAccessControl = (formationId: string) => {
  const { subscription } = useUserSubscription(formationId);
  const { data: paymentProgress } = useStudentPaymentProgress(formationId);
  const { 
    timeRemainingToday, 
    dailyTimeLimit,
    isTimeReached: isTimeLimit,
    canSendMessage 
  } = usePlanLimits({ formationId, context: 'general' });

  // Vérification principale : jours restants
  const daysRemaining = paymentProgress?.total_days_remaining ?? null;
  const isOutOfDays = daysRemaining !== null && daysRemaining <= 0;

  // Statut d'accès global
  const getAccessStatus = () => {
    // Priorité 1 : Plus de jours de formation
    if (isOutOfDays) {
      return {
        canSend: false,
        canSubmitExercise: false,
        reason: 'no_days_remaining',
        message: 'Votre solde de jours est épuisé. Rechargez pour continuer.',
        actionText: 'Recharger mon solde',
        variant: 'error' as const
      };
    }

    // Priorité 2 : Limite de temps quotidienne atteinte
    if (isTimeLimit) {
      return {
        canSend: false,
        canSubmitExercise: false,
        reason: 'daily_time_limit',
        message: 'Limite de temps quotidienne atteinte. Revenez demain ou passez à un plan supérieur.',
        actionText: 'Améliorer mon plan',
        variant: 'warning' as const
      };
    }

    // Priorité 3 : Vérifications d'abonnement spécifiques
    const messagePermission = canSendMessage();
    if (!messagePermission.allowed) {
      return {
        canSend: false,
        canSubmitExercise: true, // Les exercices peuvent être autorisés même si les messages ne le sont pas
        reason: 'subscription_limit',
        message: messagePermission.reason || 'Action non autorisée avec votre plan actuel.',
        actionText: 'Améliorer mon plan',
        variant: 'warning' as const
      };
    }

    // Accès autorisé
    return {
      canSend: true,
      canSubmitExercise: true,
      reason: null,
      message: null,
      actionText: null,
      variant: null
    };
  };

  const accessStatus = getAccessStatus();

  return {
    // Statut global
    ...accessStatus,
    
    // Informations détaillées
    daysRemaining,
    timeRemainingToday,
    dailyTimeLimit,
    subscription,
    paymentProgress,
    
    // Statut spécifiques
    isOutOfDays,
    isTimeLimit,
    
    // Fonctions utilitaires
    canSendMessage,
    
    // Pour la compatibilité avec les composants existants
    isLimitReached: !accessStatus.canSend
  };
};