import React from 'react';
import { Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SubscriptionTimerProps {
  timeRemaining: number;
  dailyLimit: number;
}

export const SubscriptionTimer: React.FC<SubscriptionTimerProps> = ({
  timeRemaining,
  dailyLimit
}) => {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const progressPercentage = ((dailyLimit - timeRemaining) / dailyLimit) * 100;

  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Temps restant aujourd'hui</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{formatTime(timeRemaining)} restant</span>
          <span className="text-muted-foreground">
            {formatTime(dailyLimit - timeRemaining)} / {formatTime(dailyLimit)}
          </span>
        </div>
        
        <Progress 
          value={progressPercentage} 
          className="h-2"
        />
      </div>
    </div>
  );
};