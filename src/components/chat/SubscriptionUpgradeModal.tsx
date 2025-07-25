
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, AlertTriangle, MessageCircle, Phone, Clock, Calendar } from 'lucide-react';

interface SubscriptionUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  formationId: string;
  variant?: 'warning' | 'error';
  restrictionType?: 'message_limit' | 'call_restriction' | 'time_limit' | 'call_day_restriction';
  currentPlan?: string;
}

export const SubscriptionUpgradeModal: React.FC<SubscriptionUpgradeModalProps> = ({
  isOpen,
  onClose,
  message,
  formationId,
  variant = 'warning',
  restrictionType,
  currentPlan = 'free'
}) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate(`/formation/${formationId}/pricing`);
    onClose();
  };

  const getIcon = () => {
    switch (restrictionType) {
      case 'message_limit':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'call_restriction':
      case 'call_day_restriction':
        return <Phone className="w-5 h-5 text-green-500" />;
      case 'time_limit':
        return <Clock className="w-5 h-5 text-orange-500" />;
      default:
        return variant === 'error' ? 
          <AlertTriangle className="w-5 h-5 text-red-500" /> : 
          <Crown className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getRecommendedPlan = () => {
    if (currentPlan === 'free') {
      switch (restrictionType) {
        case 'message_limit':
        case 'call_restriction':
          return 'Standard';
        case 'call_day_restriction':
        case 'time_limit':
          return 'Premium';
        default:
          return 'Standard';
      }
    }
    return 'Premium';
  };

  const getDetailedMessage = () => {
    const baseMessage = message;
    const recommendedPlan = getRecommendedPlan();
    
    const planBenefits = {
      'Standard': '• Messages illimités\n• Appels audio autorisés\n• Accès aux exercices',
      'Premium': '• Tout du plan Standard\n• Appels vidéo disponibles\n• Temps illimité\n• Tous les jours d\'appel'
    };

    return `${baseMessage}\n\nPassez au plan ${recommendedPlan} pour débloquer :\n${planBenefits[recommendedPlan as keyof typeof planBenefits]}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            Restriction d'abonnement
          </DialogTitle>
          <DialogDescription className="text-left whitespace-pre-line">
            {getDetailedMessage()}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Plus tard
          </Button>
          <Button 
            onClick={handleUpgrade} 
            className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Crown className="w-4 h-4 mr-2" />
            Voir les offres
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
