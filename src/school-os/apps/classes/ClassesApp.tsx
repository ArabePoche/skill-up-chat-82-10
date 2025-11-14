// Application de gestion des classes
import React, { useState } from 'react';
import { CreateClassModal } from '@/school/components/CreateClassModal';
import { ClassesList } from '@/school/components/ClassesList';

export const ClassesApp: React.FC = () => {
  // TODO: Récupérer l'école et l'année scolaire depuis le contexte ou les props
  const schoolId = 'temp-school-id';
  const schoolYearId = 'temp-school-year-id';

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Classes</h2>
          <p className="text-muted-foreground mt-1">
            Créez et gérez les classes de votre établissement
          </p>
        </div>
        <CreateClassModal schoolId={schoolId} schoolYearId={schoolYearId} />
      </div>

      <ClassesList schoolId={schoolId} schoolYearId={schoolYearId} />
    </div>
  );
};
