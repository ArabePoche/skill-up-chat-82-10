import React from 'react';
import { Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface PaymentProgressBarProps {
  totalDaysRemaining: number;
  maxDays?: number;
  className?: string;
}

/**
 * Affiche la progression des jours restants de paiement
 * Avec une barre de progression colorée selon le temps restant
 */
const PaymentProgressBar: React.FC<PaymentProgressBarProps> = ({ 
  totalDaysRemaining, 
  maxDays = 30,
  className = ""
}) => {
  // Calculer le pourcentage et la couleur
  const percentage = Math.max(0, Math.min((totalDaysRemaining / maxDays) * 100, 100));
  
  const getColorClass = () => {
    if (totalDaysRemaining <= 3) return 'bg-red-500';
    if (totalDaysRemaining <= 7) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (totalDaysRemaining <= 0) return 'Accès expiré';
    if (totalDaysRemaining <= 3) return 'Urgent - Renouvellement nécessaire';
    if (totalDaysRemaining <= 7) return 'Attention - Bientôt expiré';
    if (totalDaysRemaining <= 15) return 'Bientôt à renouveler';
    return 'Accès actif';
  };

  const getStatusIcon = () => {
    if (totalDaysRemaining <= 7) return '⚠️';
    if (totalDaysRemaining <= 15) return '⏰';
    return '✅';
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Accès formation</span>
          </span>
          <span className="text-lg">
            {getStatusIcon()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">
            {Math.max(0, totalDaysRemaining)}
          </span>
          <span className="text-sm text-muted-foreground">
            jour{totalDaysRemaining !== 1 ? 's' : ''} restant{totalDaysRemaining !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="space-y-2">
          <Progress 
            value={percentage}
            className="h-3"
            indicatorClassName={getColorClass()}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{getStatusText()}</span>
            <span>{Math.round(percentage)}%</span>
          </div>
        </div>

        {totalDaysRemaining > maxDays && (
          <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-blue-700">
              Bonus : +{totalDaysRemaining - maxDays} jour{totalDaysRemaining - maxDays !== 1 ? 's' : ''} supplémentaire{totalDaysRemaining - maxDays !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentProgressBar;