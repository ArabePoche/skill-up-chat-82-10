import React from 'react';
import { Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

/**
 * Composant d'affichage du timer de limites de plan
 * Remplace SubscriptionTimer
 */

interface PlanLimitTimerProps {
  timeRemainingToday: number | null; // en minutes
  dailyTimeLimit: number | null; // en minutes
  sessionTime?: string;
  className?: string;
}

export const PlanLimitTimer: React.FC<PlanLimitTimerProps> = ({
  timeRemainingToday,
  dailyTimeLimit,
  sessionTime,
  className = ''
}) => {
  if (timeRemainingToday === null || dailyTimeLimit === null) {
    return null;
  }

  const progressPercentage = Math.max(0, (timeRemainingToday / dailyTimeLimit) * 100);
  const isLowTime = timeRemainingToday <= 15;
  const isCriticalTime = timeRemainingToday <= 5;

  return (
    <div className={`bg-card border rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between text-sm mb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-medium">
            Temps restant: <span className={isCriticalTime ? 'text-destructive' : isLowTime ? 'text-orange-500' : 'text-primary'}>{timeRemainingToday}min</span>
          </span>
        </div>
        {sessionTime && (
          <div className="text-muted-foreground">
            Session: {sessionTime}
          </div>
        )}
      </div>
      
      <Progress 
        value={progressPercentage} 
        className={`h-2 ${isCriticalTime ? '[&>div]:bg-destructive' : isLowTime ? '[&>div]:bg-orange-500' : ''}`}
      />
      
      {isCriticalTime && (
        <div className="flex items-center gap-1 mt-2 text-destructive text-xs animate-pulse">
          <span>⚠️</span>
          <span className="font-medium">Plus que {timeRemainingToday}min !</span>
        </div>
      )}
    </div>
  );
};