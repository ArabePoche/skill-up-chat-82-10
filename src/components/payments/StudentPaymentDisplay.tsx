// Affichage du solde et des jours restants pour les élèves
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, Calendar, Euro } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFormationPricing } from '@/hooks/useFormationPricing';
import { useUserSubscription } from '@/hooks/useUserSubscription';

interface StudentPaymentDisplayProps {
  formationId: string;
  studentId?: string; // ID de l'élève spécifique (optionnel)
}

export const StudentPaymentDisplay: React.FC<StudentPaymentDisplayProps> = ({
  formationId,
  studentId
}) => {
  const { user } = useAuth();
  const { pricingOptions } = useFormationPricing(formationId);
  const { subscription } = useUserSubscription(formationId, studentId);

  const { data: paymentProgress, isLoading } = useQuery({
    queryKey: ['student-payment-progress', studentId || user?.id, formationId],
    queryFn: async () => {
      const targetUserId = studentId || user?.id;
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from('student_payment_progress')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('formation_id', formationId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!(studentId || user?.id)
  });

  // Calcul du prix par jour basé sur l'abonnement de l'utilisateur
  const getUserPricePerDay = () => {
    if (!subscription || !pricingOptions) return 0;
    
    const userPlan = pricingOptions.find(
      option => option.plan_type === subscription.plan_type && option.is_active
    );
    
    if (!userPlan || !userPlan.price_monthly) return 0;
    return userPlan.price_monthly / 30;
  };

  const pricePerDay = getUserPricePerDay();
  const currentPlanName = subscription?.plan_type || 'free';

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
  const totalHoursRemaining = paymentProgress?.hours_remaining || 0;
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
            {totalHoursRemaining > 0 && (
              <span className="text-xl text-gray-700 ml-2">
                + {totalHoursRemaining}h
              </span>
            )}
          </span>
          {(totalDaysRemaining <= 5 && totalDaysRemaining > 0) || (totalDaysRemaining === 0 && totalHoursRemaining <= 120) ? (
            <span className="text-sm text-red-600 font-medium">
              ⚠️ Bientôt épuisé
            </span>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Solde disponible</span>
            <span>
              {totalDaysRemaining}j
              {totalHoursRemaining > 0 && ` + ${totalHoursRemaining}h`}
              /{Math.max(30, totalDaysRemaining)}j
            </span>
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

        {/* Informations de tarification */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Plan actuel:</span>
            <span className="font-medium capitalize text-blue-600">
              {currentPlanName === 'free' ? 'Gratuit' : 
               currentPlanName === 'standard' ? 'Standard' :
               currentPlanName === 'premium' ? 'Premium' :
               currentPlanName === 'groupe' ? 'Groupe' : currentPlanName}
            </span>
          </div>
          {pricePerDay > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 flex items-center">
                <Euro className="w-3 h-3 mr-1" />
                Prix par jour:
              </span>
              <span className="font-medium text-green-600">
                {pricePerDay.toFixed(2)} €/jour
              </span>
            </div>
          )}
          {totalDaysRemaining > 0 && pricePerDay > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Valeur restante:</span>
              <span className="font-medium text-blue-600">
                {(() => {
                  // Convertir les heures en fraction de jour pour le calcul
                  const totalDaysValue = totalDaysRemaining + (totalHoursRemaining / 24);
                  return (totalDaysValue * pricePerDay).toFixed(2);
                })()}€
              </span>
            </div>
          )}
        </div>

        {totalDaysRemaining === 0 && totalHoursRemaining === 0 && (
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