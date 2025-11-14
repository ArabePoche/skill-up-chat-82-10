// Application de gestion des élèves
import React from 'react';

export const StudentsApp: React.FC = () => {
  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Élèves</h2>
          <p className="text-muted-foreground mt-1">
            Gérez les élèves de votre établissement
          </p>
        </div>
      </div>
      {/* TODO: Implémenter l'interface de gestion des élèves */}
    </div>
  );
};
