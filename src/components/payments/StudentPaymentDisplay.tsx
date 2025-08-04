// Affichage du solde et des jours restants pour les élèves
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface StudentPaymentDisplayProps {
  formationId: string;
}

export const StudentPaymentDisplay: React.FC<StudentPaymentDisplayProps> = ({
  formationId
}) => {
  const { user } = useAuth();

  const { data: paymentProgress, isLoading } = useQuery({
    queryKey: ['student-payment-progress', user?.id, formationId],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('student_payment_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('formation_id', formationId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalDaysRemaining = paymentProgress?.total_days_remaining || 0;
  const lastPaymentDate = paymentProgress?.last_payment_date;

  // Calcul de la couleur de la barre selon les jours restants
  const getProgressColor = (days: number) => {
    if (days <= 5) return 'bg-red-500';
    if (days <= 15) return 'bg-orange-500';
    return 'bg-green-500';
  };

  // Calcul du pourcentage pour la barre (sans plafond fixe)
  const maxDisplayDays = Math.max(30, totalDaysRemaining); // Minimum 30 pour l'affichage
  const progressPercentage = Math.min(100, (totalDaysRemaining / maxDisplayDays) * 100);

  return (
    <Card className="mb-4 border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <Clock className="w-5 h-5 mr-2 text-blue-600" />
          Temps restant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-gray-900">
            {totalDaysRemaining} jour{totalDaysRemaining > 1 ? 's' : ''}
          </span>
          {totalDaysRemaining <= 5 && totalDaysRemaining > 0 && (
            <span className="text-sm text-red-600 font-medium">
              ⚠️ Bientôt épuisé
            </span>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Solde disponible</span>
            <span>{totalDaysRemaining}/{maxDisplayDays}j</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(totalDaysRemaining)}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {lastPaymentDate && (
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2" />
            Dernier paiement: {new Date(lastPaymentDate).toLocaleDateString('fr-FR')}
          </div>
        )}

        {totalDaysRemaining === 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-orange-800 text-sm">
              Votre solde est épuisé. Effectuez un paiement pour continuer à accéder à la formation.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};