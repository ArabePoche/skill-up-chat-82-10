// Application de gestion des classes
import React from 'react';
import { CreateClassModal } from '@/school/components/CreateClassModal';
import { ClassesList } from '@/school/components/ClassesList';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useAuth } from '@/hooks/useAuth';
import { useUserSchool } from '@/school/hooks/useSchool';

export const ClassesApp: React.FC = () => {
  const { user } = useAuth();
  const { data: school } = useUserSchool(user?.id);
  const { activeSchoolYear } = useSchoolYear();

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
