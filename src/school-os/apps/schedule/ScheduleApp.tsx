// Application de gestion de l'emploi du temps
import React from 'react';

export const ScheduleApp: React.FC = () => {
  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Emploi du Temps</h2>
          <p className="text-muted-foreground mt-1">
            Gérez les emplois du temps de votre établissement
          </p>
        </div>
      </div>
      {/* TODO: Implémenter l'interface de gestion des emplois du temps */}
    </div>
  );
};
