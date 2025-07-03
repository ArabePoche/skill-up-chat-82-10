import { useState, useCallback } from 'react';
import { useUserSubscription } from './useUserSubscription';
import { useFormationPricing } from './useFormationPricing';
import { useSubscriptionLimits } from './useSubscriptionLimits';
import { useVideoTimer } from './useVideoTimer';
import { useAuth } from './useAuth';

interface LessonAccessControl {
  // Subscription info
  subscription: any;
  pricing: any;
  
  // Time management
  timeRemainingToday: number | null;
  dailyTimeLimit: number | null;
  isLimitReached: boolean;
  sessionTime: string;
  canPlay: boolean;
  
  // Permission checks
  checkPermission: (action: 'message' | 'call' | 'video_call') => { allowed: boolean; message?: string };
  
  // Alert management
  showAlert: boolean;
  alertMessage: string;
  alertVariant: 'warning' | 'error';
  hideAlert: () => void;
  
  // Actions
  handleSendMessage: (message: string) => { allowed: boolean; showAlert?: boolean };
  handleCall: (type: 'audio' | 'video') => { allowed: boolean; showAlert?: boolean };
  onUpgrade?: () => void;
}

export const useLessonAccessControl = (
  formationId: string, 
  isVideoPlaying: boolean = false,
  onUpgrade?: () => void
): LessonAccessControl => {
  const { user } = useAuth();
  const { subscription } = useUserSubscription(formationId);
  const { pricingOptions } = useFormationPricing(formationId);
  
  const {
    timeRemainingToday,
    dailyTimeLimit,
    isLimitReached,
    checkPermission,
    incrementMessageCount
  } = useSubscriptionLimits(formationId);
  
  const {
    sessionTime,
    canPlay
  } = useVideoTimer({ formationId, isPlaying: isVideoPlaying });

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertVariant, setAlertVariant] = useState<'warning' | 'error'>('warning');

  const hideAlert = useCallback(() => {
    setShowAlert(false);
  }, []);

  const showSubscriptionAlert = useCallback((message: string, variant: 'warning' | 'error' = 'warning') => {
    setAlertMessage(message);
    setAlertVariant(variant);
    setShowAlert(true);
  }, []);

  const handleSendMessage = useCallback((message: string) => {
    if (!message.trim()) return { allowed: false };

    const permission = checkPermission('message');
    if (!permission.allowed) {
      showSubscriptionAlert(permission.message || 'Action non autorisée');
      return { allowed: false, showAlert: true };
    }

    if (isLimitReached) {
      showSubscriptionAlert(
        'Vous avez atteint votre limite de temps quotidienne. Revenez demain ou passez à un plan supérieur.',
        'error'
      );
      return { allowed: false, showAlert: true };
    }

    // Incrémenter le compteur de messages après vérification
    incrementMessageCount();

    return { allowed: true };
  }, [checkPermission, isLimitReached, showSubscriptionAlert, formationId]);

  const handleCall = useCallback((type: 'audio' | 'video') => {
    const action = type === 'audio' ? 'call' : 'video_call';
    const permission = checkPermission(action);
    
    if (!permission.allowed) {
      showSubscriptionAlert(permission.message || 'Appel non autorisé');
      return { allowed: false, showAlert: true };
    }

    if (isLimitReached) {
      showSubscriptionAlert(
        'Vous avez atteint votre limite de temps quotidienne. Revenez demain ou passez à un plan supérieur.',
        'error'
      );
      return { allowed: false, showAlert: true };
    }

    return { allowed: true };
  }, [checkPermission, isLimitReached, showSubscriptionAlert]);

  return {
    subscription,
    pricing: pricingOptions,
    timeRemainingToday,
    dailyTimeLimit,
    isLimitReached,
    sessionTime,
    canPlay,
    checkPermission,
    showAlert,
    alertMessage,
    alertVariant,
    hideAlert,
    handleSendMessage,
    handleCall,
    onUpgrade
  };
};