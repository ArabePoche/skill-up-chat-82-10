import { useState, useCallback } from 'react';
import { useUserSubscription } from './useUserSubscription';
import { useFormationPricing } from './useFormationPricing';
import { usePlanLimits } from '@/plan-limits/hooks/usePlanLimits';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';

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
  const { data: userRole } = useUserRole(formationId);
  
  const {
    timeRemainingToday,
    dailyTimeLimit,
    isTimeReached: isLimitReached,
    canSendMessage,
    canMakeCall,
    canUseTime,
    useMessage,
    sessionTime
  } = usePlanLimits({ 
    formationId, 
    context: isVideoPlaying ? 'video' : 'general',
    isActive: isVideoPlaying 
  });

  const timeCheck = canUseTime();
  const canPlay = timeCheck.allowed;

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

    // Les professeurs peuvent toujours envoyer des messages
    if (userRole?.role === 'teacher') {
      return { allowed: true };
    }

    const permission = canSendMessage();
    if (!permission.allowed) {
      showSubscriptionAlert(permission.reason || 'Action non autorisée');
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
    useMessage();

    return { allowed: true };
  }, [canSendMessage, isLimitReached, showSubscriptionAlert, formationId, userRole, useMessage]);

  const handleCall = useCallback((type: 'audio' | 'video') => {
    // Les professeurs peuvent toujours passer des appels
    if (userRole?.role === 'teacher') {
      return { allowed: true };
    }

    const permission = canMakeCall(type);
    
    if (!permission.allowed) {
      showSubscriptionAlert(permission.reason || 'Appel non autorisé');
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
  }, [canMakeCall, isLimitReached, showSubscriptionAlert, userRole]);

  return {
    subscription,
    pricing: pricingOptions,
    timeRemainingToday,
    dailyTimeLimit,
    isLimitReached,
    sessionTime,
    canPlay,
    checkPermission: canSendMessage,
    showAlert,
    alertMessage,
    alertVariant,
    hideAlert,
    handleSendMessage,
    handleCall,
    onUpgrade
  };
};