// Application de gestion des notes
import React from 'react';

export const GradesApp: React.FC = () => {
  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Notes</h2>
          <p className="text-muted-foreground mt-1">
            Gérez les notes et évaluations de vos élèves
          </p>
        </div>
      </div>
      {/* TODO: Implémenter l'interface de gestion des notes */}
    </div>
  );
};
