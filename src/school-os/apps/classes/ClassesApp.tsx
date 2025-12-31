/**
 * Application de comptabilité de l'école
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import AccountingView from "../accounting/components/AccountingView";

export const AccountingApp: React.FC = () => {
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
    <div className="h-full flex flex-col p-6">
      <AccountingView schoolId={school.id} />
    </div>
  );
};
