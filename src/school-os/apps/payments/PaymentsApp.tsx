// Application de gestion des paiements scolaires
import React from 'react';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { PaymentsView } from './components/PaymentsView';

export const PaymentsApp: React.FC = () => {
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
    <div className="h-full flex flex-col min-h-0 p-3 sm:p-4 md:p-6">
      <PaymentsView schoolId={school.id} />
    </div>
  );
};
