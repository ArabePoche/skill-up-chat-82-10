
import { useState, useEffect, useCallback } from 'react';
import { useUserSubscription } from './useUserSubscription';
import { useFormationPricing } from './useFormationPricing';
import { useAuth } from './useAuth';

interface SubscriptionLimits {
  canSendMessages: boolean;
  canMakeCalls: boolean;
  canMakeVideoCalls: boolean;
  timeRemainingToday: number | null;
  dailyTimeLimit: number | null;
  isLimitReached: boolean;
  checkPermission: (action: 'message' | 'call' | 'video_call') => { 
    allowed: boolean; 
    message?: string; 
    restrictionType?: string;
    currentPlan?: string;
  };
  updateTimeUsed: (minutesUsed: number) => void;
  incrementMessageCount: () => void;
}

export const useSubscriptionLimits = (formationId: string): SubscriptionLimits => {
  const { user } = useAuth();
  const { subscription } = useUserSubscription(formationId);
  const { pricingOptions } = useFormationPricing(formationId);
  const [timeRemainingToday, setTimeRemainingToday] = useState<number | null>(null);

  // Trouver les options de pricing pour le plan actuel de l'utilisateur
  const userPricing = pricingOptions?.find(p => 
    p.plan_type === subscription?.plan_type && p.is_active
  );

  // Fonction pour obtenir les jours autorisés en français
  const getDaysInFrench = (days: string[]) => {
    const dayMap: { [key: string]: string } = {
      'monday': 'lundi',
      'tuesday': 'mardi', 
      'wednesday': 'mercredi',
      'thursday': 'jeudi',
      'friday': 'vendredi',
      'saturday': 'samedi',
      'sunday': 'dimanche'
    };
    return days.map(day => dayMap[day.toLowerCase()] || day).join(' et ');
  };

  // Fonction pour vérifier si c'est un jour d'appel autorisé
  const isCallDayAllowed = useCallback(() => {
    if (!userPricing?.allowed_call_days || userPricing.allowed_call_days.length === 0) {
      return true; // Pas de restriction si aucun jour spécifié
    }
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    return userPricing.allowed_call_days.some(day => day.toLowerCase() === today);
  }, [userPricing]);

  const checkPermission = useCallback((action: 'message' | 'call' | 'video_call') => {
    if (!userPricing) {
      return { 
        allowed: false, 
        message: 'Plan non trouvé. Veuillez vous inscrire à cette formation.',
        restrictionType: 'no_plan',
        currentPlan: 'none'
      };
    }

    const currentPlan = userPricing.plan_type;

    // Vérifier les limites de messages pour le plan standard
    if (action === 'message' && userPricing.plan_type === 'standard' && userPricing.message_limit_per_day) {
      const today = new Date().toDateString();
      const messagesKey = `messages_${user?.id}_${formationId}_${today}`;
      const messagesSent = parseInt(localStorage.getItem(messagesKey) || '0');
      
      if (messagesSent >= userPricing.message_limit_per_day) {
        return {
          allowed: false,
          message: `🚫 Vous avez atteint votre limite de ${userPricing.message_limit_per_day} messages par jour pour le plan Standard.\n\nPassez au plan Premium pour envoyer des messages illimités.`,
          restrictionType: 'message_limit',
          currentPlan
        };
      }
    }

    switch (action) {
      case 'message':
        if (!userPricing.allow_discussion) {
          return {
            allowed: false,
            message: '💬 Les messages ne sont pas disponibles avec votre plan actuel.\n\nPassez au plan Standard ou Premium pour échanger avec vos formateurs.',
            restrictionType: 'message_restriction',
            currentPlan
          };
        }
        break;
        
      case 'call':
        if (!userPricing.allow_calls || userPricing.call_type === 'none') {
          return {
            allowed: false,
            message: '📞 Les appels audio ne sont pas disponibles avec votre plan actuel.\n\nPassez au plan Standard ou Premium pour accéder aux appels.',
            restrictionType: 'call_restriction',
            currentPlan
          };
        }
        
        if (!isCallDayAllowed()) {
          const allowedDays = getDaysInFrench(userPricing.allowed_call_days || []);
          return {
            allowed: false,
            message: `📅 Aujourd'hui n'est pas un jour d'appel autorisé pour votre plan.\n\nVos jours d'appel sont : ${allowedDays}.\n\nPassez au plan Premium pour appeler tous les jours.`,
            restrictionType: 'call_day_restriction',
            currentPlan
          };
        }
        break;
        
      case 'video_call':
        if (!userPricing.allow_calls || (userPricing.call_type !== 'video' && userPricing.call_type !== 'both')) {
          return {
            allowed: false,
            message: '📹 Les appels vidéo ne sont pas disponibles avec votre plan actuel.\n\nPassez au plan Premium pour accéder aux appels vidéo.',
            restrictionType: 'call_restriction',
            currentPlan
          };
        }
        
        if (!isCallDayAllowed()) {
          const allowedDays = getDaysInFrench(userPricing.allowed_call_days || []);
          return {
            allowed: false,
            message: `📅 Aujourd'hui n'est pas un jour d'appel autorisé pour votre plan.\n\nVos jours d'appel sont : ${allowedDays}.\n\nPassez au plan Premium pour appeler tous les jours.`,
            restrictionType: 'call_day_restriction',
            currentPlan
          };
        }
        break;
    }

    return { allowed: true, currentPlan };
  }, [userPricing, user?.id, formationId, isCallDayAllowed]);

  // Gestion du timer quotidien
  useEffect(() => {
    if (!userPricing?.time_limit_minutes_per_day || !user?.id) {
      setTimeRemainingToday(null);
      return;
    }

    const storageKey = `timeUsed_${user.id}_${formationId}_${new Date().toDateString()}`;
    const timeUsed = parseInt(localStorage.getItem(storageKey) || '0');
    const remaining = Math.max(0, userPricing.time_limit_minutes_per_day - timeUsed);
    setTimeRemainingToday(remaining);
  }, [userPricing, subscription?.plan_type, user?.id, formationId]);

  const updateTimeUsed = useCallback((minutesUsed: number) => {
    if (!userPricing?.time_limit_minutes_per_day || !user?.id) return;

    const storageKey = `timeUsed_${user.id}_${formationId}_${new Date().toDateString()}`;
    const currentUsed = parseInt(localStorage.getItem(storageKey) || '0');
    const newUsed = currentUsed + minutesUsed;
    localStorage.setItem(storageKey, newUsed.toString());
    
    const remaining = Math.max(0, userPricing.time_limit_minutes_per_day - newUsed);
    setTimeRemainingToday(remaining);
  }, [userPricing, user?.id, formationId]);

  const incrementMessageCount = useCallback(() => {
    if (!user?.id) return;
    
    const today = new Date().toDateString();
    const messagesKey = `messages_${user.id}_${formationId}_${today}`;
    const messagesSent = parseInt(localStorage.getItem(messagesKey) || '0');
    localStorage.setItem(messagesKey, (messagesSent + 1).toString());
  }, [user?.id, formationId]);

  return {
    canSendMessages: userPricing?.allow_discussion || false,
    canMakeCalls: userPricing?.allow_calls || false,
    canMakeVideoCalls: userPricing?.allow_calls && (userPricing?.call_type === 'video' || userPricing?.call_type === 'both') || false,
    timeRemainingToday,
    dailyTimeLimit: userPricing?.time_limit_minutes_per_day || null,
    isLimitReached: timeRemainingToday === 0,
    checkPermission,
    updateTimeUsed,
    incrementMessageCount
  };
};
