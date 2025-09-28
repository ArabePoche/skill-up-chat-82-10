
import React, { useState, useCallback } from 'react';
import { MessageCircle, Phone, Video, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlanLimits } from '@/plan-limits/hooks/usePlanLimits';
import { useCallFunctionality } from '@/hooks/useCallFunctionality';
import { SubscriptionUpgradeModal } from './SubscriptionUpgradeModal';
import { PlanLimitTimer } from '@/plan-limits/components/PlanLimitTimer';
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
    isTimeReached,
    isMessageLimitReached,
    canSendMessage,
    canMakeCall,
    useMessage,
    sessionTime
  } = usePlanLimits({ 
    formationId, 
    context: 'chat' 
  });

  const { initiateCall } = useCallFunctionality(formationId);

  const showRestrictionModal = useCallback((message: string, restrictionType?: string, currentPlan?: string) => {
    setUpgradeModalData({ message, restrictionType, currentPlan });
    setShowUpgradeModal(true);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim()) return;

    const messagePermission = canSendMessage();
    if (!messagePermission.allowed) {
      showRestrictionModal(messagePermission.reason || 'Action non autorisée', 'message');
      return;
    }

    if (isTimeReached || isMessageLimitReached) {
      showRestrictionModal(
        '⏱️ Limites quotidiennes atteintes.\n\nRevenez demain ou passez à un plan supérieur pour continuer.',
        'time'
      );
      return;
    }

    onSendMessage?.(message);
    await useMessage();
    setMessage('');
  }, [message, canSendMessage, isTimeReached, isMessageLimitReached, onSendMessage, useMessage, showRestrictionModal]);

  const handleCall = useCallback(async (type: 'audio' | 'video') => {
    if (!receiverId) {
      toast.error('Aucun destinataire disponible pour l\'appel');
      return;
    }

    const callPermission = canMakeCall(type);
    if (!callPermission.allowed) {
      showRestrictionModal(callPermission.reason || 'Appel non autorisé', 'call');
      return;
    }

    if (isTimeReached) {
      showRestrictionModal(
        '⏱️ Temps quotidien épuisé.\n\nRevenez demain ou passez à un plan supérieur pour continuer.',
        'time'
      );
      return;
    }

    const callInitiated = await initiateCall(type, receiverId, lessonId);
    if (callInitiated) {
      toast.success(`Appel ${type === 'audio' ? 'audio' : 'vidéo'} en cours...`);
    }
  }, [receiverId, canMakeCall, isTimeReached, initiateCall, lessonId, showRestrictionModal]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Timer de limites de plan */}
      {timeRemainingToday !== null && dailyTimeLimit !== null && (
        <div className="p-4 border-b">
          <PlanLimitTimer
            timeRemainingToday={timeRemainingToday}
            dailyTimeLimit={dailyTimeLimit}
            sessionTime={sessionTime}
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
            disabled={isTimeReached}
          >
            <Phone size={16} />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCall('video')}
            className="flex-shrink-0"
            title="Appel vidéo"
            disabled={isTimeReached}
          >
            <Video size={16} />
          </Button>

          {/* Champ de saisie */}
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isTimeReached ? "Limite de temps atteinte" : "Tapez votre message..."}
            disabled={isTimeReached || isMessageLimitReached}
            className="flex-1"
          />

          {/* Bouton d'envoi */}
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || isTimeReached || isMessageLimitReached}
            size="sm"
            className="flex-shrink-0"
          >
            <Send size={16} />
          </Button>
        </div>

        {/* Message d'aide */}
        {(isTimeReached || isMessageLimitReached) && (
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
