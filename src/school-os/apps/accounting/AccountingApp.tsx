/**
 * Application de comptabilité de l'école
 */
import React from 'react';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { AccountingView } from './components/AccountingView';

export const AccountingApp: React.FC = () => {
  const { school, isLoading } = useSchoolYear();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chargement de l'école...</p>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Aucune école trouvée</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      <AccountingView schoolId={school.id} />
    </div>
  );
};
