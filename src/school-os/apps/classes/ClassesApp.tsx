// Application de gestion des classes
import React from 'react';
import { CreateClassModal } from '@/school/components/CreateClassModal';
import { ClassesList } from '@/school/components/ClassesList';
import { useSchoolYear } from '@/school/context/SchoolYearContext';

export const ClassesApp: React.FC = () => {
  const { school, activeSchoolYear } = useSchoolYear();

  if (!school?.id || !activeSchoolYear?.id) {
    return (
      <div className="p-6 h-full overflow-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Veuillez créer une école et une année scolaire pour gérer les classes
          </p>
        </div>
      </div>
    );
  }

  const schoolId = school.id;
  const schoolYearId = activeSchoolYear.id;

  return (
    <div className="p-6 h-full overflow-auto">
      <ClassesList schoolId={schoolId} schoolYearId={schoolYearId} />
    </div>
  );
};
