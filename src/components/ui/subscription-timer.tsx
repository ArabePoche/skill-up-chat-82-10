import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SubscriptionTimerProps {
  timeRemaining: number | null;
  dailyLimit: number | null;
  className?: string;
}

export const SubscriptionTimer: React.FC<SubscriptionTimerProps> = ({
  timeRemaining,
  dailyLimit,
  className = ''
}) => {
  if (timeRemaining === null || dailyLimit === null) return null;

  const isLowTime = timeRemaining <= 5;
  const isTimeUp = timeRemaining <= 0;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  return (
    <Card className={`${className} ${isTimeUp ? 'border-destructive bg-destructive/5' : isLowTime ? 'border-orange-500 bg-orange-50' : 'border-primary/20 bg-primary/5'}`}>
      <CardContent className="p-3">
        <div className="flex items-center space-x-2">
          {isTimeUp ? (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          ) : (
            <Clock className="w-4 h-4 text-primary" />
          )}
          <div className="flex-1">
            <p className={`text-sm font-medium ${isTimeUp ? 'text-destructive' : isLowTime ? 'text-orange-600' : 'text-foreground'}`}>
              {isTimeUp ? 'Temps épuisé pour aujourd\'hui' : `Temps restant aujourd'hui : ${formatTime(timeRemaining)}`}
            </p>
            <p className="text-xs text-muted-foreground">
              Limite quotidienne : {formatTime(dailyLimit)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};