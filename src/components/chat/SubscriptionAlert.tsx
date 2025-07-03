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
    <Alert className={`border-l-4 ${variant === 'error' ? 'border-l-destructive bg-destructive/5' : 'border-l-orange-500 bg-orange-50'}`}>
      <AlertTriangle className={`h-4 w-4 ${variant === 'error' ? 'text-destructive' : 'text-orange-500'}`} />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-sm">{message}</span>
        {onUpgrade && (
          <Button
            variant="outline"
            size="sm"
            onClick={onUpgrade}
            className="ml-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600"
          >
            <Crown size={14} className="mr-1" />
            Mettre à niveau
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};