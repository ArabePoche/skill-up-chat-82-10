
import React, { useState, useCallback } from 'react';
import { MessageCircle, Phone, Video, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useCallFunctionality } from '@/hooks/useCallFunctionality';
import { SubscriptionUpgradeModal } from './SubscriptionUpgradeModal';
import { SubscriptionTimer } from '@/components/ui/subscription-timer';
import { toast } from 'sonner';

interface EnhancedChatInterfaceProps {
  formationId: string;
  lessonId: string;
  receiverId?: string;
  onSendMessage?: (message: string) => void;
  onUpgrade?: () => void;
  children?: React.ReactNode;
}

export const EnhancedChatInterface: React.FC<EnhancedChatInterfaceProps> = ({
  formationId,
  lessonId,
  receiverId,
  onSendMessage,
  onUpgrade,
  children
}) => {
  const [message, setMessage] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalData, setUpgradeModalData] = useState<{
    message: string;
    restrictionType?: string;
    currentPlan?: string;
  }>({ message: '' });
  
  const {
    timeRemainingToday,
    dailyTimeLimit,
    isLimitReached,
    checkPermission,
    incrementMessageCount
  } = useSubscriptionLimits(formationId);

  const { initiateCall } = useCallFunctionality(formationId);

  const showRestrictionModal = useCallback((message: string, restrictionType?: string, currentPlan?: string) => {
    setUpgradeModalData({ message, restrictionType, currentPlan });
    setShowUpgradeModal(true);
  }, []);

  const handleSendMessage = useCallback(() => {
    if (!message.trim()) return;

    const permission = checkPermission('message');
    if (!permission.allowed) {
      showRestrictionModal(permission.message || 'Action non autorisée', permission.restrictionType, permission.currentPlan);
      return;
    }

    if (isLimitReached) {
      showRestrictionModal(
        '⏱️ Temps de visionnage quotidien épuisé.\n\nRevenez demain ou passez à un plan supérieur pour continuer.',
        'time_limit'
      );
      return;
    }

    onSendMessage?.(message);
    incrementMessageCount();
    setMessage('');
  }, [message, checkPermission, isLimitReached, onSendMessage, incrementMessageCount, showRestrictionModal]);

  const handleCall = useCallback(async (type: 'audio' | 'video') => {
    if (!receiverId) {
      toast.error('Aucun destinataire disponible pour l\'appel');
      return;
    }

    const action = type === 'audio' ? 'call' : 'video_call';
    const permission = checkPermission(action);
    
    if (!permission.allowed) {
      showRestrictionModal(permission.message || 'Appel non autorisé', permission.restrictionType, permission.currentPlan);
      return;
    }

    if (isLimitReached) {
      showRestrictionModal(
        '⏱️ Temps de visionnage quotidien épuisé.\n\nRevenez demain ou passez à un plan supérieur pour continuer.',
        'time_limit'
      );
      return;
    }

    const callInitiated = await initiateCall(type, receiverId, lessonId);
    if (callInitiated) {
      toast.success(`Appel ${type === 'audio' ? 'audio' : 'vidéo'} en cours...`);
    }
  }, [receiverId, checkPermission, isLimitReached, initiateCall, lessonId, showRestrictionModal]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Timer d'abonnement */}
      {timeRemainingToday !== null && dailyTimeLimit !== null && (
        <div className="p-4 border-b">
          <SubscriptionTimer
            timeRemaining={timeRemainingToday}
            dailyLimit={dailyTimeLimit}
          />
        </div>
      )}

      {/* Contenu principal du chat */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>

      {/* Zone de saisie */}
      <div className="border-t bg-background p-4">
        <div className="flex items-center space-x-2">
          {/* Boutons d'appel */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCall('audio')}
            className="flex-shrink-0"
            title="Appel audio"
            disabled={isLimitReached}
          >
            <Phone size={16} />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCall('video')}
            className="flex-shrink-0"
            title="Appel vidéo"
            disabled={isLimitReached}
          >
            <Video size={16} />
          </Button>

          {/* Champ de saisie */}
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isLimitReached ? "Limite de temps atteinte" : "Tapez votre message..."}
            disabled={isLimitReached}
            className="flex-1"
          />

          {/* Bouton d'envoi */}
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || isLimitReached}
            size="sm"
            className="flex-shrink-0"
          >
            <Send size={16} />
          </Button>
        </div>

        {/* Message d'aide */}
        {isLimitReached && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Limite de temps quotidienne atteinte. 
            {onUpgrade && (
              <Button
                variant="link"
                size="sm"
                onClick={onUpgrade}
                className="text-xs p-0 h-auto ml-1"
              >
                Passer à un plan supérieur
              </Button>
            )}
          </p>
        )}
      </div>

      {/* Modal de mise à niveau */}
      <SubscriptionUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        message={upgradeModalData.message}
        formationId={formationId}
        variant="warning"
        restrictionType={upgradeModalData.restrictionType as any}
        currentPlan={upgradeModalData.currentPlan}
      />
    </div>
  );
};
