// Application de gestion des enseignants
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { TeachersView } from './components/TeachersView';

export const TeachersApp: React.FC = () => {
  const [searchParams] = useSearchParams();
  const schoolId = searchParams.get('id') || undefined;

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 shrink-0">
        <h2 className="text-2xl font-bold">Gestion des Enseignants</h2>
        <p className="text-muted-foreground mt-1">
          Gérez les enseignants, paiements, remarques et absences
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <TeachersView schoolId={schoolId} />
      </div>
    </div>
  );
};
