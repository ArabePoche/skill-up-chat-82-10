// Application de gestion des enseignants
import React from 'react';
import { TeachersList } from './components';

export const TeachersApp: React.FC = () => {
  return (
    <div className="p-6 h-full overflow-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Gestion des Enseignants</h2>
        <p className="text-muted-foreground mt-1">
          Gérez les enseignants de votre établissement
        </p>
      </div>
      <TeachersList />
    </div>
  );
};
