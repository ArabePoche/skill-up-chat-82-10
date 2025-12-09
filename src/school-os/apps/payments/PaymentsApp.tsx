// Application de gestion des paiements scolaires
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { PaymentsView } from './components/PaymentsView';

export const PaymentsApp: React.FC = () => {
  const { t } = useTranslation();
  const { school, isLoading } = useSchoolYear();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{t('schoolOS.common.loading')}</p>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{t('schoolOS.common.noData')}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 md:p-6">
      <PaymentsView schoolId={school.id} />
    </div>
  );
};
