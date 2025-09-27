
import { useState, useEffect, useCallback } from 'react';
import { useUserSubscription } from './useUserSubscription';
import { useFormationPricing } from './useFormationPricing';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';

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
  const { data: userRole } = useUserRole(formationId);
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
    // Les professeurs peuvent tout faire sans restriction
    if (userRole?.role === 'teacher') {
      return { 
        allowed: true,
        currentPlan: 'teacher'
      };
    }

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
  }, [userPricing, user?.id, formationId, isCallDayAllowed, userRole]);

  // Gestion du timer quotidien - sécurisé côté serveur
  useEffect(() => {
    if (!userPricing?.time_limit_minutes_per_day || !user?.id) {
      setTimeRemainingToday(null);
      return;
    }

    const fetchTimeFromServer = async () => {
      try {
        // Utiliser la date du serveur pour éviter la manipulation côté client
        const response = await fetch('https://jiasafdbfqqhhdazoybu.supabase.co/rest/v1/rpc/get_server_date', {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppYXNhZmRiZnFxaGhkYXpveWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MTQ5MTAsImV4cCI6MjA2NTQ5MDkxMH0.TXPwCkGAZRrn83pTsZHr2QFZwX03nBWdNPJN0s_jLKQ'
          }
        });
        
        const serverDate = await response.json();
        const today = new Date(serverDate).toISOString().split('T')[0]; // Format YYYY-MM-DD du serveur
        const storageKey = `timeUsed_${user.id}_${formationId}_${today}`;
        
        // Récupérer le temps utilisé depuis localStorage
        const timeUsed = parseInt(localStorage.getItem(storageKey) || '0');
        const remaining = Math.max(0, userPricing.time_limit_minutes_per_day - timeUsed);
        
        console.log('Timer debug (server-based):', {
          userPlan: userPricing.plan_type,
          dailyLimit: userPricing.time_limit_minutes_per_day,
          timeUsed,
          remaining,
          storageKey,
          serverDate: today
        });
        
        setTimeRemainingToday(remaining);
      } catch (error) {
        console.error('Error fetching server time, fallback to client:', error);
        // Fallback vers la date client si le serveur n'est pas disponible
        const today = new Date().toISOString().split('T')[0];
        const storageKey = `timeUsed_${user.id}_${formationId}_${today}`;
        const timeUsed = parseInt(localStorage.getItem(storageKey) || '0');
        const remaining = Math.max(0, userPricing.time_limit_minutes_per_day - timeUsed);
        setTimeRemainingToday(remaining);
      }
    };

    fetchTimeFromServer();
  }, [userPricing, subscription?.plan_type, user?.id, formationId]);

  const updateTimeUsed = useCallback(async (minutesUsed: number) => {
    if (!userPricing?.time_limit_minutes_per_day || !user?.id) return;

    try {
      // Utiliser la date du serveur pour la cohérence
      const response = await fetch('https://jiasafdbfqqhhdazoybu.supabase.co/rest/v1/rpc/get_server_date', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppYXNhZmRiZnFxaGhkYXpveWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MTQ5MTAsImV4cCI6MjA2NTQ5MDkxMH0.TXPwCkGAZRrn83pTsZHr2QFZwX03nBWdNPJN0s_jLKQ'
        }
      });
      
      const serverDate = await response.json();
      const today = new Date(serverDate).toISOString().split('T')[0];
      const storageKey = `timeUsed_${user.id}_${formationId}_${today}`;
      
      const currentUsed = parseInt(localStorage.getItem(storageKey) || '0');
      const newUsed = currentUsed + minutesUsed;
      
      localStorage.setItem(storageKey, newUsed.toString());
      console.log('Time updated (server-based):', { currentUsed, minutesUsed, newUsed, storageKey, serverDate: today });
      
      const remaining = Math.max(0, userPricing.time_limit_minutes_per_day - newUsed);
      setTimeRemainingToday(remaining);
    } catch (error) {
      console.error('Error updating time with server date, using client date:', error);
      // Fallback vers la date client
      const today = new Date().toISOString().split('T')[0];
      const storageKey = `timeUsed_${user.id}_${formationId}_${today}`;
      const currentUsed = parseInt(localStorage.getItem(storageKey) || '0');
      const newUsed = currentUsed + minutesUsed;
      localStorage.setItem(storageKey, newUsed.toString());
      const remaining = Math.max(0, userPricing.time_limit_minutes_per_day - newUsed);
      setTimeRemainingToday(remaining);
    }
  }, [userPricing, user?.id, formationId]);

  const incrementMessageCount = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Utiliser la date du serveur pour la cohérence
      const response = await fetch('https://jiasafdbfqqhhdazoybu.supabase.co/rest/v1/rpc/get_server_date', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppYXNhZmRiZnFxaGhkYXpveWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MTQ5MTAsImV4cCI6MjA2NTQ5MDkxMH0.TXPwCkGAZRrn83pTsZHr2QFZwX03nBWdNPJN0s_jLKQ'
        }
      });
      
      const serverDate = await response.json();
      const today = new Date(serverDate).toISOString().split('T')[0];
      const messagesKey = `messages_${user.id}_${formationId}_${today}`;
      
      const messagesSent = parseInt(localStorage.getItem(messagesKey) || '0');
      localStorage.setItem(messagesKey, (messagesSent + 1).toString());
      
      console.log('Message count updated (server-based):', { messagesSent: messagesSent + 1, messagesKey, serverDate: today });
    } catch (error) {
      console.error('Error incrementing message count with server date, using client date:', error);
      // Fallback vers la date client
      const today = new Date().toISOString().split('T')[0];
      const messagesKey = `messages_${user.id}_${formationId}_${today}`;
      const messagesSent = parseInt(localStorage.getItem(messagesKey) || '0');
      localStorage.setItem(messagesKey, (messagesSent + 1).toString());
    }
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
