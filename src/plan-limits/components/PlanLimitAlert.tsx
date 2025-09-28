import React from 'react';
import { AlertTriangle, Clock, MessageCircle, Phone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * Composant d'alerte pour les limites de plan
 * Remplace SubscriptionAlert
 */

interface PlanLimitAlertProps {
  message: string;
  restrictionType?: 'message' | 'time' | 'call' | 'general';
  variant?: 'warning' | 'error' | 'info';
  onUpgrade?: () => void;
  onClose?: () => void;
  className?: string;
}

export const PlanLimitAlert: React.FC<PlanLimitAlertProps> = ({
  message,
  restrictionType = 'general',
  variant = 'warning',
  onUpgrade,
  onClose,
  className = ''
}) => {
  const getIcon = () => {
    switch (restrictionType) {
      case 'message':
        return <MessageCircle className="w-4 h-4" />;
      case 'time':
        return <Clock className="w-4 h-4" />;
      case 'call':
        return <Phone className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <Alert className={`${className}`} variant={variant === 'error' ? 'destructive' : 'default'}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <AlertDescription className="whitespace-pre-line">
            {message}
          </AlertDescription>
          <div className="flex gap-2 mt-3">
            {onUpgrade && (
              <Button 
                size="sm" 
                onClick={onUpgrade}
                variant={variant === 'error' ? 'destructive' : 'default'}
              >
                Passer à un plan supérieur
              </Button>
            )}
            {onClose && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onClose}
              >
                Fermer
              </Button>
            )}
          </div>
        </div>
      </div>
    </Alert>
  );
};