/**
 * Application de gestion du personnel de l'école
 * Gestion des rôles et permissions des membres
 */
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { PersonnelView } from './components/PersonnelView';

export const PersonnelApp: React.FC = () => {
  const [searchParams] = useSearchParams();
  const schoolId = searchParams.get('id') || undefined;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 sm:p-6 shrink-0">
        <h2 className="text-xl sm:text-2xl font-bold">Gestion du Personnel</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez les membres, leurs rôles et permissions
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <PersonnelView schoolId={schoolId} />
      </div>
    </div>
  );
};
