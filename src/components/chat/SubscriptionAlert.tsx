import React from 'react';
import { AlertTriangle, Crown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface SubscriptionAlertProps {
  message: string;
  onUpgrade?: () => void;
  variant?: 'warning' | 'error';
}

export const SubscriptionAlert: React.FC<SubscriptionAlertProps> = ({
  message,
  onUpgrade,
  variant = 'warning'
}) => {
  return (
    <Alert className={variant === 'error' ? 'border-destructive' : 'border-warning'}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onUpgrade && (
          <Button
            onClick={onUpgrade}
            size="sm"
            className="ml-4"
            variant="outline"
          >
            <Crown className="h-4 w-4 mr-2" />
            Passer à Premium
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};