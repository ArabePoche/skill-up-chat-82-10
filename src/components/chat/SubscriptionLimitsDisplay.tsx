import React, { useState } from 'react';
import { AlertTriangle, MessageCircle, Clock, Phone, Video } from 'lucide-react';
import { SubscriptionAlert } from './SubscriptionAlert';
import { SubscriptionTimer } from '@/components/ui/subscription-timer';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';

interface SubscriptionLimitsDisplayProps {
  formationId: string;
  onUpgrade?: () => void;
}

export const SubscriptionLimitsDisplay: React.FC<SubscriptionLimitsDisplayProps> = ({
  formationId,
  onUpgrade
}) => {
  const {
    timeRemainingToday,
    dailyTimeLimit,
    isLimitReached,
    checkPermission
  } = useSubscriptionLimits(formationId);

  const [showMessageAlert, setShowMessageAlert] = useState(false);
  const [showCallAlert, setShowCallAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const handleMessageAttempt = () => {
    const permission = checkPermission('message');
    if (!permission.allowed && permission.message) {
      setAlertMessage(permission.message);
      setShowMessageAlert(true);
      return false;
    }
    return true;
  };

  const handleCallAttempt = (type: 'call' | 'video_call') => {
    const permission = checkPermission(type);
    if (!permission.allowed && permission.message) {
      setAlertMessage(permission.message);
      setShowCallAlert(true);
      return false;
    }
    return true;
  };

  return (
    <>
      {/* Timer d'abonnement */}
      {timeRemainingToday !== null && dailyTimeLimit !== null && (
        <div className="mb-4">
          <SubscriptionTimer
            timeRemaining={timeRemainingToday}
            dailyLimit={dailyTimeLimit}
          />
        </div>
      )}

      {/* Alertes de messages */}
      {showMessageAlert && (
        <SubscriptionAlert
          message={alertMessage}
          onUpgrade={onUpgrade}
          variant="warning"
        />
      )}

      {/* Alertes d'appels */}
      {showCallAlert && (
        <SubscriptionAlert
          message={alertMessage}
          onUpgrade={onUpgrade}
          variant="warning"
        />
      )}

      {/* Si la limite de temps est atteinte */}
      {isLimitReached && (
        <SubscriptionAlert
          message="Vous avez atteint votre limite de temps quotidienne. Revenez demain ou passez à un plan supérieur pour continuer."
          onUpgrade={onUpgrade}
          variant="error"
        />
      )}
    </>
  );
};