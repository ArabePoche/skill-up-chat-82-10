/**
 * Vue dédiée aux statistiques des paiements School OS.
 * Isole l'ancienne vue statistique du suivi mensuel pour en faire un onglet principal.
 */
import React from 'react';
import { useCurrentSchoolYear } from '@/school/hooks/useSchool';
import { useMonthlyPaymentStats } from '../hooks/useMonthlyPaymentStats';
import { MonthlyPaymentStats } from './MonthlyPaymentStats';

interface PaymentStatisticsViewProps {
  schoolId?: string;
}

export const PaymentStatisticsView: React.FC<PaymentStatisticsViewProps> = ({ schoolId }) => {
  const { data: schoolYear, isLoading: schoolYearLoading } = useCurrentSchoolYear(schoolId);
  const { stats, isLoading: statsLoading } = useMonthlyPaymentStats(schoolId, schoolYear?.id);

  if (schoolYearLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-muted-foreground">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return <MonthlyPaymentStats stats={stats} />;
};