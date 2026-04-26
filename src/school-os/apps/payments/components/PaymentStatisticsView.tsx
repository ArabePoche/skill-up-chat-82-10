/**
 * Vue des statistiques de paiement
 */
import React from 'react';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useMonthlyPaymentStats } from '../hooks/useMonthlyPaymentStats';
import { MonthlyPaymentStats } from './MonthlyPaymentStats';
import { useTranslation } from 'react-i18next';

interface PaymentStatisticsViewProps {
  schoolId?: string;
}

export const PaymentStatisticsView: React.FC<PaymentStatisticsViewProps> = ({ schoolId }) => {
  const { t } = useTranslation();
  const { activeSchoolYear, isLoading: schoolYearLoading } = useSchoolYear();
  const { stats, isLoading: statsLoading } = useMonthlyPaymentStats(schoolId, activeSchoolYear?.id);

  if (schoolYearLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-muted-foreground">{t('payments.loadingStats')}</p>
        </div>
      </div>
    );
  }

  return <MonthlyPaymentStats stats={stats} />;
};